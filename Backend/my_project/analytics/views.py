"""
analytics/views.py — DRF view layer for the analytics surface.

Single GET endpoint:
    /api/analytics/forecast/?lot=<purdue_code>&horizon=<minutes>[&as_of=<iso>]

The view orchestrates four pure-Python modules (data_access, forecasting,
derived_metrics, insights) and assembles a single response covering all
three user stories so the frontend only has to make one call per lot.

Acceptance-criteria coverage:
    #10 AC1 — payload contains recent_actuals + baseline_forecast + gru_forecast.
    #10 AC2 — every lot resolves through proxy_mapping to a different
              Aarhus garage with its own data + capacity.
    #10 AC3 — input validation via ForecastQuerySerializer returns 400 with
              a structured error body for every bad input.
    #11 AC1-3 — `insights` block is attached, capped, and human-readable.
    #12 AC1-3 — `derived` block is attached with the agreed schema.
    #12 AC4   — empty/missing data returns 200 with null/empty fields,
                never a 500.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from boiler_park_backend.lots import get_lot

from . import data_access, forecasting, derived_metrics, insights
from .constants import DEFAULT_LOOKBACK_MIN, DEFAULT_STEP_MIN
from .constants import SUPPORTED_HORIZONS_MIN
from .proxy_mapping import SUPPORTED_PURDUE_LOTS
from .serializers import ForecastQuerySerializer

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def forecast_view(request):
    """
    Return the assembled analytics payload for one Purdue lot.

    Response on success (200) — keys are stable; values may be null when
    the underlying artifact is absent (see module docstring).
    """
    serializer = ForecastQuerySerializer(data=request.query_params)
    if not serializer.is_valid():
        errors = serializer.errors
        code = (request.query_params.get("lot") or "").upper()

        if "error" in errors:
            payload: Dict[str, Any] = {"error": str(errors["error"][0])}
            if "reason" in errors:
                payload["reason"] = str(errors["reason"][0])
            if "supported" in errors:
                payload["supported"] = [str(v) for v in errors["supported"]]
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        # Keep a stable 400 contract regardless of DRF's internal error shape.
        if "lot" in errors and code not in SUPPORTED_PURDUE_LOTS:
            return Response(
                {
                    "error": "unknown_lot",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "non_field_errors" in errors:
            return Response(
                {
                    "error": "unknown_lot",
                    "reason": "no_proxy_mapping",
                    "supported": SUPPORTED_PURDUE_LOTS,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "horizon" in errors:
            return Response(
                {
                    "error": "unsupported_horizon",
                    "supported": list(SUPPORTED_HORIZONS_MIN),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"error": "invalid_request", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    params = serializer.validated_data
    lot_code: str = params["lot"]
    horizon_min: int = params["horizon"]
    as_of: datetime = params.get("as_of") or datetime.now(timezone.utc)

    # Force the forecasting module to load its artifacts before we inspect
    # metadata such as step size and window length.
    forecasting.artifact_status()
    gru_meta = getattr(forecasting, "_gru_meta", {}) or {}
    gru_window_bins = int(gru_meta.get("window_bins") or gru_meta.get("window") or 0)
    gru_window_minutes = int(gru_meta.get("window_minutes") or DEFAULT_LOOKBACK_MIN)
    if gru_meta.get("step_minutes"):
        gru_step_min = int(gru_meta.get("step_minutes"))
    elif gru_window_bins > 0 and gru_window_minutes > 0:
        gru_step_min = max(1, gru_window_minutes // gru_window_bins)
    else:
        gru_step_min = DEFAULT_STEP_MIN
    lookback_min = max(DEFAULT_LOOKBACK_MIN, gru_window_minutes)

    lot_meta = get_lot(lot_code) or {}
    capacity = data_access.get_capacity(lot_code)

    # Pull recent actuals first; both forecasters can use them as input
    # context (the GRU explicitly needs the last `window` points).
    actuals = data_access.recent_actuals(
        lot_code,
        max(lookback_min, horizon_min),
        gru_step_min,
        as_of=as_of,
    )

    recent_pcts = [float(p["occupancy_pct"]) for p in actuals]
    start_from = as_of

    baseline = forecasting.baseline_forecast(
        purdue_code=lot_code,
        horizon_min=horizon_min,
        step_min=gru_step_min,
        capacity=capacity,
        start_from=start_from,
    )
    gru = forecasting.gru_forecast(
        purdue_code=lot_code,
        horizon_min=horizon_min,
        step_min=gru_step_min,
        capacity=capacity,
        recent_pcts=recent_pcts,
        start_from=start_from,
    )

    payload: Dict[str, Any] = {
        "lot": lot_code,
        "lot_name": lot_meta.get("name"),
        "capacity": capacity,
        "generated_at": as_of.isoformat().replace("+00:00", "Z"),
        "horizon_minutes": horizon_min,
        "step_minutes": gru_step_min,
        "recent_actuals": actuals,
        "baseline_forecast": baseline,
        "gru_forecast": gru,
    }

    # Derived metrics depend on the assembled payload; insights then read
    # the same `derived` dict so we never compute the same number twice.
    payload["derived"] = derived_metrics.compute_derived(
        actuals=actuals,
        gru_forecast=gru,
        baseline_forecast=baseline,
        capacity=capacity,
        step_min=gru_step_min,
    )
    payload["insights"] = insights.generate_insights(payload)

    return Response(payload, status=status.HTTP_200_OK)
