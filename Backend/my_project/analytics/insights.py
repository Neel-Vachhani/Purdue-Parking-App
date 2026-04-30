"""
analytics/insights.py — User Story #11 (insight summaries).

Rule-based engine that turns the assembled forecast payload into a small
list of plain-English summary lines for the dashboard. No ML here — these
are deterministic rules over the numbers we already computed, so the
output is auditable and the frontend can render the strings verbatim.

Each rule returns either an Insight dict or None:
    {"code": str, "severity": "info"|"warn"|"alert", "message": str}

The top-level `generate_insights(payload)` runs every rule, drops Nones,
and returns at most MAX_INSIGHTS items, alert > warn > info.

Acceptance criteria:
    #11 AC1 — generates short readable summaries when forecasts exist.
    #11 AC2 — filling-fast / unusual-demand / near-full conditions each
              produce a dedicated insight.
    #11 AC3 — output strings avoid jargon, fit on one line, and are
              capped at MAX_INSIGHTS so the panel stays readable.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .constants import MAX_INSIGHTS


_SEVERITY_ORDER = {"alert": 0, "warn": 1, "info": 2}


# --- individual rules ------------------------------------------------------

def _rule_near_capacity(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Latest actual occupancy >= 90% -> alert (#11 AC2 'near-capacity')."""
    actuals = payload.get("recent_actuals") or []
    if not actuals:
        return None
    pct = float(actuals[-1].get("occupancy_pct") or 0.0)
    if pct < 90.0:
        return None
    name = payload.get("lot_name") or payload.get("lot") or "This lot"
    return {
        "code": "near_full",
        "severity": "alert",
        "message": f"{name} is nearly full ({pct:.0f}% occupied).",
    }


def _rule_filling_fast(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    GRU forecast adds >= 5 pct-points in the next 30 minutes -> warn.
    Falls back to actuals slope if GRU absent (#11 AC2 'filling fast').
    """
    gru = payload.get("gru_forecast") or []
    derived = payload.get("derived") or {}
    if gru and len(gru) >= 1:
        current = (payload.get("recent_actuals") or [{}])[-1].get("occupancy_pct")
        if current is None:
            return None
        # Find the forecast point ~30 min out (or the last one available).
        target = gru[min(len(gru) - 1, 1)]
        delta = float(target["occupancy_pct"]) - float(current)
        if delta >= 5.0:
            return {
                "code": "filling_fast",
                "severity": "warn",
                "message": f"Filling quickly — expected to add ~{delta:.0f}% in the next 30 min.",
            }
        return None
    # No GRU: use slope from derived metrics.
    slope = derived.get("rate_of_change_per_hour")
    if slope is not None and slope >= 10.0:
        return {
            "code": "filling_fast",
            "severity": "warn",
            "message": f"Filling quickly — occupancy rising about {slope:.0f}% per hour.",
        }
    return None


def _rule_time_to_full(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Forecast says capacity will be reached inside the requested horizon.
    Severity is alert because it directly affects the user's decision
    (#11 AC2 'reach capacity around X').
    """
    derived = payload.get("derived") or {}
    ttc = derived.get("time_to_capacity_min")
    horizon = payload.get("horizon_minutes")
    if not ttc or not horizon or ttc > horizon:
        return None
    eta = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    from datetime import timedelta
    eta = eta + timedelta(minutes=int(ttc))
    return {
        "code": "time_to_full",
        "severity": "alert",
        "message": f"Likely to reach capacity around {eta.strftime('%H:%M')} UTC.",
    }


def _rule_unusual_vs_baseline(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    GRU forecast >= 15 pct-points above baseline at the same step ->
    'unusually busy for this time of day' (#11 AC2 'unusual demand').
    """
    gru = payload.get("gru_forecast") or []
    base = payload.get("baseline_forecast") or []
    if not gru or not base:
        return None
    n = min(len(gru), len(base))
    deltas = []
    for i in range(n):
        try:
            deltas.append(float(gru[i]["occupancy_pct"]) - float(base[i]["occupancy_pct"]))
        except (KeyError, TypeError, ValueError):
            continue
    if not deltas:
        return None
    # Use the max positive deviation — if the model thinks anywhere in the
    # horizon will be unusually busy, we should surface it.
    peak_delta = max(deltas)
    if peak_delta < 15.0:
        return None
    return {
        "code": "unusual_demand",
        "severity": "warn",
        "message": "Demand looks unusually high for this time of day.",
    }


def _rule_quiet(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Latest actual <= 25% AND trend stable -> info, "plenty of space".
    Counterweight to the alert rules so the panel isn't only doom.
    """
    actuals = payload.get("recent_actuals") or []
    derived = payload.get("derived") or {}
    if not actuals:
        return None
    pct = float(actuals[-1].get("occupancy_pct") or 0.0)
    if pct > 25.0:
        return None
    if derived.get("utilization_trend") not in {"stable", "falling"}:
        return None
    return {
        "code": "quiet",
        "severity": "info",
        "message": f"Plenty of space — {pct:.0f}% occupied with stable demand.",
    }


def _rule_sparse_data(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Fewer than 6 actual points -> info caveat about reliability."""
    actuals = payload.get("recent_actuals") or []
    if len(actuals) >= 6:
        return None
    if not actuals:
        return {
            "code": "no_data",
            "severity": "info",
            "message": "No recent occupancy data is available for this lot.",
        }
    return {
        "code": "sparse_data",
        "severity": "info",
        "message": "Limited recent data — forecast may be less reliable.",
    }


_RULES = (
    _rule_near_capacity,
    _rule_time_to_full,
    _rule_unusual_vs_baseline,
    _rule_filling_fast,
    _rule_quiet,
    _rule_sparse_data,
)


# --- entry point -----------------------------------------------------------

def generate_insights(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Run every rule in _RULES, drop Nones, dedupe by `code`, sort by
    severity (alert -> warn -> info) and cap at MAX_INSIGHTS. Order
    inside a severity bucket is rule declaration order, which is hand-
    tuned so the most decision-relevant insight appears first.
    """
    seen: set = set()
    out: List[Dict[str, Any]] = []
    for rule in _RULES:
        try:
            insight = rule(payload)
        except Exception:
            # A buggy rule should never blow up the API. Drop it silently
            # and move on; the response still has the rest of the payload.
            insight = None
        if not insight or insight["code"] in seen:
            continue
        seen.add(insight["code"])
        out.append(insight)
    out.sort(key=lambda i: _SEVERITY_ORDER.get(i["severity"], 99))
    return out[:MAX_INSIGHTS]
