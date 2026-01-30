"""Favorite-lot availability alert orchestration."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Dict, Optional

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from boiler_park_backend.models import NotificationLog, ParkingLot, User
from .push_notifications import send_push_message

logger = logging.getLogger("favorite_alerts")

DEFAULT_THRESHOLD = 25
DEFAULT_COOLDOWN_MINUTES = 30
DEFAULT_CAPACITY_FALLBACK = 400

# Known capacities for common garages (falls back to DEFAULT_CAPACITY_FALLBACK otherwise).
LOT_CAPACITY_FALLBACKS: Dict[str, int] = {
    "PGH": 480,
    "PGG": 650,
    "PGU": 820,
    "PGNW": 500,
}


def _get_capacity(lot_code: str) -> Optional[int]:
    lot = ParkingLot.objects.filter(code__iexact=lot_code).values("capacity").first()
    if lot and lot.get("capacity"):
        return int(lot["capacity"])
    return LOT_CAPACITY_FALLBACKS.get(lot_code)


def _get_lot_name(lot_code: str) -> str:
    lot = ParkingLot.objects.filter(code__iexact=lot_code).values("name").first()
    if lot and lot.get("name"):
        return lot["name"]
    return lot_code


def _parse_timestamp(value: Optional[str]):
    if not value:
        return None
    dt = parse_datetime(value)
    if dt and timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    return dt


def _within_cooldown(entry: Optional[Dict[str, object]], now, cooldown_minutes: int) -> bool:
    if not entry:
        return False
    ts = _parse_timestamp(entry.get("ts"))
    if not ts:
        return False
    return now - ts < timedelta(minutes=max(cooldown_minutes, 1))


def handle_favorite_lot_update(lot_code: str, available_value) -> None:
    """Evaluate a Redis update and send alerts if favorite lots cross thresholds."""

    if lot_code is None or available_value is None:
        return

    lot_code = str(lot_code).upper()
    try:
        available = int(available_value)
    except (TypeError, ValueError):
        logger.debug("Skipping favorite alert for %s – value %s not int", lot_code, available_value)
        return

    available = max(available, 0)

    capacity = _get_capacity(lot_code)
    fallback_used = False
    if not capacity:
        capacity = DEFAULT_CAPACITY_FALLBACK
        fallback_used = True

    if capacity <= 0:
        logger.debug("Skipping favorite alert for %s – no capacity metadata", lot_code)
        return

    if available > capacity:
        capacity = available

    pct_available = max(min((available / capacity) * 100.0, 100.0), 0.0)
    lot_name = _get_lot_name(lot_code)

    watchers = list(
        User.objects.filter(
            favorite_lot_alerts_enabled=True,
            favorite_lots__contains=[lot_code],
        )
        .exclude(notification_token__isnull=True)
        .exclude(notification_token__exact="")
        .only(
            "id",
            "email",
            "name",
            "notification_token",
            "favorite_lot_threshold",
            "favorite_lot_cooldown_minutes",
            "favorite_lot_last_notified",
        )
    )

    if not watchers:
        return

    now = timezone.now()
    for user in watchers:
        threshold = max(1, min(95, user.favorite_lot_threshold or DEFAULT_THRESHOLD))
        cooldown = user.favorite_lot_cooldown_minutes or DEFAULT_COOLDOWN_MINUTES
        state = user.favorite_lot_last_notified or {}
        last_entry = state.get(lot_code)

        if pct_available > threshold:
            if lot_code in state:
                new_state = state.copy()
                new_state.pop(lot_code, None)
                user.favorite_lot_last_notified = new_state
                user.save(update_fields=["favorite_lot_last_notified"])
            continue

        if _within_cooldown(last_entry, now, cooldown):
            continue

        message = f"{lot_name} is only {pct_available:.0f}% available ({available} spots)."
        if fallback_used:
            logger.debug(
                "Using fallback capacity for %s when evaluating favorite alerts", lot_code
            )

        extra = {
            "lot": lot_code,
            "available": available,
            "percentAvailable": round(pct_available, 1),
            "threshold": threshold,
        }

        success = True
        error_message = None
        try:
            send_push_message(user.notification_token, message, extra=extra)
        except Exception as exc:  # pragma: no cover - network failure path
            success = False
            error_message = str(exc)
            logger.exception("Failed to send favorite alert for %s to %s", lot_code, user.email)

        NotificationLog.objects.create(
            user=user,
            notification_type="favorite_threshold",
            message=message,
            success=success,
            error_message=error_message,
        )

        if success:
            new_state = state.copy()
            new_state[lot_code] = {
                "ts": now.isoformat(),
                "percent": round(pct_available, 2),
                "available": available,
            }
            user.favorite_lot_last_notified = new_state
            user.save(update_fields=["favorite_lot_last_notified"])
