"""
analytics/derived_metrics.py — User Story #12 (dashboard orchestration).

Computes a small, structured set of derived indicators from the actuals +
GRU forecast that the frontend can render directly without doing any math
of its own.

Returned shape (keys are stable — frontend depends on them):
    {
        "current_occupancy_pct":  float | None,
        "rate_of_change_per_hour": float | None,   # pct-points / hour
        "time_to_capacity_min":    int   | None,   # null if not converging
        "expected_peak":           {"timestamp": str, "occupancy_pct": float} | None,
        "utilization_trend":       "rising"|"falling"|"stable"|"unknown",
        "confidence":              "high"|"medium"|"low",
    }

Acceptance criteria coverage:
    #12 AC1 — rate_of_change_per_hour and time_to_capacity_min are computed.
    #12 AC2 — every metric is parameterized on the per-lot inputs, so two
              lots produce different numbers when their inputs differ.
    #12 AC3 — output is structured and JSON-ready; no further computation
              is required on the frontend to interpret it.
    #12 AC4 — empty / flat / missing inputs yield the documented null
              contract instead of an exception.
"""

from __future__ import annotations

from typing import List, Optional, Dict, Any


# Slope tolerance for the "stable" utilization trend label, in percentage
# points per hour. ±2 pct/hr is small enough that most frontend users would
# describe the lot as "not really changing".
_STABLE_BAND_PCT_PER_HR = 2.0


def _slope_pct_per_hr(actuals: List[dict]) -> Optional[float]:
    """
    Linear-regression slope of occupancy_pct over the last <=30 minutes of
    actuals, scaled to percentage points per hour. Falls back to a
    two-point difference when fewer than 4 samples are available, since
    OLS on 2 points is just the slope of the line through them anyway.
    Returns None when fewer than 2 points exist.
    """
    if not actuals or len(actuals) < 2:
        return None

    # Keep the most recent ~30 minutes worth of points but always >=2.
    window = actuals[-6:] if len(actuals) >= 6 else actuals[-len(actuals):]
    # Convert timestamps -> minutes-from-first-point so slope is in pct/min,
    # then scale to per-hour at the end.
    from datetime import datetime
    def _parse(s: str) -> datetime:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))

    try:
        times = [_parse(p["timestamp"]) for p in window]
    except Exception:
        return None
    pcts = [float(p["occupancy_pct"]) for p in window]
    t0 = times[0]
    xs = [(t - t0).total_seconds() / 60.0 for t in times]

    if len(xs) < 4:
        # Two-point fallback: simple (y_last - y_first) / (x_last - x_first).
        dx = xs[-1] - xs[0]
        if dx <= 0:
            return 0.0
        return (pcts[-1] - pcts[0]) / dx * 60.0

    # Ordinary least squares closed form. Avoids a numpy dep here.
    n = len(xs)
    mx = sum(xs) / n
    my = sum(pcts) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, pcts))
    den = sum((x - mx) ** 2 for x in xs)
    if den == 0:
        return 0.0
    return num / den * 60.0


def _time_to_capacity(
    gru_forecast: Optional[List[dict]],
    step_min: int,
) -> Optional[int]:
    """
    Walk the GRU forecast and return the number of minutes ahead at which
    occupancy first reaches >=100%. None if the forecast never crosses or
    the forecast is missing.
    """
    if not gru_forecast:
        return None
    for i, point in enumerate(gru_forecast, start=1):
        try:
            if float(point["occupancy_pct"]) >= 100.0:
                return i * step_min
        except (KeyError, TypeError, ValueError):
            continue
    return None


def _expected_peak(gru_forecast: Optional[List[dict]]) -> Optional[Dict[str, Any]]:
    """Return the timestamp + occupancy_pct of the GRU's max within horizon."""
    if not gru_forecast:
        return None
    best: Optional[Dict[str, Any]] = None
    for p in gru_forecast:
        try:
            pct = float(p["occupancy_pct"])
        except (KeyError, TypeError, ValueError):
            continue
        if best is None or pct > best["occupancy_pct"]:
            best = {"timestamp": p["timestamp"], "occupancy_pct": pct}
    return best


def _trend_from_slope(slope: Optional[float]) -> str:
    if slope is None:
        return "unknown"
    if slope > _STABLE_BAND_PCT_PER_HR:
        return "rising"
    if slope < -_STABLE_BAND_PCT_PER_HR:
        return "falling"
    return "stable"


def _confidence(actuals: List[dict], gru_present: bool, baseline_present: bool) -> str:
    """
    Heuristic confidence label. high = both models loaded and >= 6 actual
    points; medium = one model missing OR sparse actuals; low = both models
    missing or no actuals at all.
    """
    have_actuals = len(actuals) >= 6
    if not actuals:
        return "low"
    if gru_present and baseline_present and have_actuals:
        return "high"
    if (gru_present or baseline_present) and have_actuals:
        return "medium"
    if gru_present or baseline_present:
        return "medium"
    return "low"


def compute_derived(
    actuals: List[dict],
    gru_forecast: Optional[List[dict]],
    baseline_forecast: Optional[List[dict]],
    capacity: Optional[int],
    step_min: int,
) -> Dict[str, Any]:
    """
    Top-level entry point used by the view layer. See module docstring for
    the returned shape and the AC mapping. Always returns a fully-formed
    dict — never raises — so the JSON response is shape-stable.
    """
    if not actuals:
        # Empty-input contract (#12 AC4): every numeric field is null,
        # trend is unknown, confidence is low. Frontend can rely on the
        # keys existing.
        return {
            "current_occupancy_pct": None,
            "rate_of_change_per_hour": None,
            "time_to_capacity_min": None,
            "expected_peak": _expected_peak(gru_forecast),
            "utilization_trend": "unknown",
            "confidence": _confidence(actuals, bool(gru_forecast), bool(baseline_forecast)),
        }

    current_pct = float(actuals[-1].get("occupancy_pct") or 0.0)
    slope = _slope_pct_per_hr(actuals)
    return {
        "current_occupancy_pct": round(current_pct, 1),
        "rate_of_change_per_hour": round(slope, 2) if slope is not None else None,
        "time_to_capacity_min": _time_to_capacity(gru_forecast, step_min),
        "expected_peak": _expected_peak(gru_forecast),
        "utilization_trend": _trend_from_slope(slope),
        "confidence": _confidence(actuals, bool(gru_forecast), bool(baseline_forecast)),
    }
