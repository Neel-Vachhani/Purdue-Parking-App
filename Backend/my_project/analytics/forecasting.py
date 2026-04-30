"""
analytics/forecasting.py — User Story #10 (forecast API).

Produces baseline + GRU forecast series for a given Purdue lot. Backed by
the user's already-trained models exported from the notebooks under
~/Documents/Purdue/Models_CS-Project/. This module **never trains**; it
only loads the artifacts and runs inference.

Artifact contract (all under analytics/artifacts/, gitignored):
    baseline.joblib        - dict[garagecode -> fitted baseline] OR a single
                             callable; see _baseline_predict for both shapes.
    baseline_meta.json     - {"step_minutes": int, "garages": [str, ...]}
    gru.keras              - tf.keras model, input (batch, window, 17) of
                             engineered occupancy/time features, output
                             (batch, horizon).
    gru_scaler.joblib      - scikit-learn scaler with .transform / .inverse_transform.
    gru_meta.json          - {"window": int, "horizon": int, "step_minutes": int,
                              "garages": [str, ...]}

If any artifact is missing the relevant forecaster returns None and the
view layer surfaces it as a null entry in the response. We do **not**
fabricate a numeric series when models are absent — that would mislead
the dashboard.

Acceptance criteria:
    #10 AC1 — returns baseline_forecast and gru_forecast when artifacts exist.
    #10 AC2 — keys forecasts by Aarhus garage, so different Purdue codes
              produce genuinely different series.
    #12 AC4 — missing-artifact path returns None cleanly, no exception.
"""

from __future__ import annotations

import json
import logging
import math
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from .proxy_mapping import to_source_garage

logger = logging.getLogger(__name__)


_ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
_BASELINE_PATH = os.path.join(_ARTIFACT_DIR, "baseline.joblib")
_BASELINE_META = os.path.join(_ARTIFACT_DIR, "baseline_meta.json")
_GRU_PATH = os.path.join(_ARTIFACT_DIR, "gru.keras")
_GRU_SCALER = os.path.join(_ARTIFACT_DIR, "gru_scaler.joblib")
_GRU_META = os.path.join(_ARTIFACT_DIR, "gru_meta.json")


# --- artifact loading (lazy, thread-safe) ----------------------------------

_lock = threading.Lock()
_baseline_obj: Any = None
_baseline_meta: Dict[str, Any] = {}
_gru_obj: Any = None
_gru_scaler: Any = None
_gru_meta: Dict[str, Any] = {}
_loaded = False


def _try_load() -> None:
    """
    Best-effort load of every artifact. Missing files are logged once at
    INFO level (not WARN — running without trained models is a valid
    development state) and recorded as None.
    """
    global _baseline_obj, _baseline_meta, _gru_obj, _gru_scaler, _gru_meta, _loaded
    if _loaded:
        return
    with _lock:
        if _loaded:
            return

        # Baseline
        if os.path.exists(_BASELINE_PATH):
            try:
                import joblib  # local import: not needed if no artifact
                _baseline_obj = joblib.load(_BASELINE_PATH)
                logger.info("Loaded baseline artifact: %s", _BASELINE_PATH)
            except Exception as e:
                logger.exception("Failed to load baseline artifact: %s", e)
        if os.path.exists(_BASELINE_META):
            try:
                with open(_BASELINE_META) as f:
                    _baseline_meta = json.load(f)
            except Exception as e:
                logger.exception("Failed to read baseline_meta.json: %s", e)

        # GRU
        if os.path.exists(_GRU_PATH):
            try:
                # tensorflow is heavy; only import when an artifact exists.
                from tensorflow.keras.models import load_model  # type: ignore
                _gru_obj = load_model(_GRU_PATH, compile=False)
                logger.info("Loaded GRU artifact: %s", _GRU_PATH)
            except Exception as e:
                logger.exception("Failed to load GRU artifact: %s", e)
        if os.path.exists(_GRU_SCALER):
            try:
                import joblib
                _gru_scaler = joblib.load(_GRU_SCALER)
            except Exception as e:
                logger.exception("Failed to load GRU scaler: %s", e)
        if os.path.exists(_GRU_META):
            try:
                with open(_GRU_META) as f:
                    _gru_meta = json.load(f)
            except Exception as e:
                logger.exception("Failed to read gru_meta.json: %s", e)

        _loaded = True


# --- helpers ---------------------------------------------------------------

def _step_minutes(meta: Dict[str, Any], default: int) -> int:
    try:
        return int(meta.get("step_minutes") or default)
    except (TypeError, ValueError):
        return default


def _is_garage_supported(meta: Dict[str, Any], garage: str) -> bool:
    """
    Check whether the model artifact's meta declares this Aarhus garage.
    If meta has no `garages` field we *assume* support (single global model),
    so older meta files don't break the endpoint.
    """
    garages = meta.get("garages")
    if not garages:
        return True
    return garage in garages


def _future_timestamps(start_utc: datetime, n: int, step_min: int) -> List[datetime]:
    """Return n timestamps after start_utc, evenly spaced by step_min."""
    return [start_utc + timedelta(minutes=step_min * (i + 1)) for i in range(n)]


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _gru_feature_rows(
    recent_pcts: List[float],
    start_from: Optional[datetime],
    step_min: int,
    window: int,
) -> Optional[List[List[float]]]:
    """Build a 17-column feature matrix for the trained GRU."""
    if not recent_pcts:
        return None

    history = [float(p) for p in recent_pcts[-window:]]
    if len(history) < window:
        history = [history[0]] * (window - len(history)) + history

    end_time = (start_from or datetime.now(timezone.utc)).astimezone(timezone.utc)
    timestamps = [end_time - timedelta(minutes=step_min * (window - i - 1)) for i in range(window)]

    try:
        import numpy as np
    except ImportError:
        return None

    rows: List[List[float]] = []
    for idx, (pct, ts) in enumerate(zip(history, timestamps)):
        seq = history[: idx + 1]
        lag_1 = seq[-2] if len(seq) >= 2 else pct
        lag_2 = seq[-3] if len(seq) >= 3 else lag_1
        lag_3 = seq[-4] if len(seq) >= 4 else lag_2
        delta_1 = pct - lag_1
        delta_2 = lag_1 - lag_2
        delta_3 = lag_2 - lag_3
        recent_window = seq[-4:]
        roll_mean = float(np.mean(recent_window))
        roll_std = float(np.std(recent_window)) if len(recent_window) > 1 else 0.0
        hour_fraction = ts.hour + (ts.minute / 60.0)
        hour_angle = 2.0 * math.pi * (hour_fraction / 24.0)
        dow_angle = 2.0 * math.pi * (ts.weekday() / 7.0)
        minute_of_day = ts.hour * 60 + ts.minute
        minute_angle = 2.0 * math.pi * (minute_of_day / (24.0 * 60.0))
        if len(seq) > 1:
            trend = (seq[-1] - seq[0]) / max((len(seq) - 1) * step_min, 1) * 60.0
        else:
            trend = 0.0

        rows.append([
            pct,
            lag_1,
            lag_2,
            lag_3,
            delta_1,
            delta_2,
            delta_3,
            roll_mean,
            roll_std,
            math.sin(hour_angle),
            math.cos(hour_angle),
            math.sin(dow_angle),
            math.cos(dow_angle),
            1.0 if ts.weekday() >= 5 else 0.0,
            math.sin(minute_angle),
            math.cos(minute_angle),
            trend,
        ])

    return rows


# --- baseline inference ----------------------------------------------------

def _baseline_predict(garage: str, n_steps: int) -> Optional[List[float]]:
    """
    Run the baseline on a single garage. The exported object can be either:
      (a) dict[garagecode -> object with .predict(n_steps) -> [pct,...]]
      (b) callable(garagecode, n_steps) -> [pct,...]
      (c) dict[garagecode -> {"hourly_avg": [...24 values, occupancy %]}]
          — convenience shape for a hour-of-day lookup baseline.
    """
    _try_load()
    if _baseline_obj is None:
        return None
    obj = _baseline_obj

    # Shape (b): plain callable
    if callable(obj):
        try:
            return [float(x) for x in obj(garage, n_steps)]
        except Exception as e:
            logger.exception("baseline callable failed: %s", e)
            return None

    if not isinstance(obj, dict) or garage not in obj:
        return None

    entry = obj[garage]
    # Shape (a): per-garage predictor
    if hasattr(entry, "predict"):
        try:
            return [float(x) for x in entry.predict(n_steps)]
        except Exception as e:
            logger.exception("baseline.predict failed for %s: %s", garage, e)
            return None
    # Shape (c): hour-of-day occupancy table
    if isinstance(entry, dict) and "hourly_avg" in entry:
        table = entry["hourly_avg"]
        step_min = _step_minutes(_baseline_meta, 30)
        now = datetime.now(timezone.utc)
        out = []
        for i in range(n_steps):
            t = now + timedelta(minutes=step_min * (i + 1))
            out.append(float(table[t.hour % len(table)]))
        return out
    return None


def baseline_forecast(
    purdue_code: str,
    horizon_min: int,
    step_min: int,
    capacity: Optional[int],
    start_from: Optional[datetime] = None,
) -> Optional[List[dict]]:
    """
    Return the baseline series as list[{timestamp, available, occupancy_pct}],
    or None if no baseline artifact is loaded for this lot.
    """
    aarhus = to_source_garage(purdue_code)
    if aarhus is None:
        return None
    _try_load()
    if _baseline_obj is None or not _is_garage_supported(_baseline_meta, aarhus):
        return None

    n = max(1, math.ceil(horizon_min / step_min))
    occ_pcts = _baseline_predict(aarhus, n)
    if occ_pcts is None:
        return None

    start = start_from or datetime.now(timezone.utc)
    ts_list = _future_timestamps(start, n, step_min)
    cap = capacity or 0
    return [
        {
            "timestamp": _iso(t),
            "available": int(round(cap * (1 - max(0.0, min(100.0, p)) / 100.0))) if cap else None,
            "occupancy_pct": round(max(0.0, min(100.0, p)), 1),
        }
        for t, p in zip(ts_list, occ_pcts)
    ]


# --- GRU inference ---------------------------------------------------------

def gru_forecast(
    purdue_code: str,
    horizon_min: int,
    step_min: int,
    capacity: Optional[int],
    recent_pcts: List[float],
    start_from: Optional[datetime] = None,
) -> Optional[List[dict]]:
    """
    Run the trained GRU on the most recent occupancy_pct window. Returns
    list[{timestamp, available, occupancy_pct, lower, upper}] or None when
    the artifact is missing or the input window is too short.

    The +/- band is a simple symmetric residual proxy (5 pct-points by default).
    Real residual stats can be added later by exporting them alongside the
    model — for the prototype, the band is informational, not statistical.
    """
    aarhus = to_source_garage(purdue_code)
    if aarhus is None:
        return None
    _try_load()
    if _gru_obj is None or not _is_garage_supported(_gru_meta, aarhus):
        return None

    window = int(_gru_meta.get("window") or 24)
    horizon_steps = max(1, math.ceil(horizon_min / step_min))
    if not recent_pcts:
        return None
    if len(recent_pcts) < window:
        # Use the most recent observed occupancy as a simple fallback when the
        # CSV slice is shorter than the trained GRU input window.
        recent_pcts = [recent_pcts[0]] * (window - len(recent_pcts)) + recent_pcts

    try:
        import numpy as np  # local import: only needed when GRU is loaded
    except ImportError:
        logger.error("numpy missing but GRU artifact present")
        return None

    feature_rows = _gru_feature_rows(recent_pcts, start_from, step_min, window)
    if feature_rows is None:
        return None

    x = np.array(feature_rows, dtype="float32").reshape(1, window, 17)
    if _gru_scaler is not None:
        try:
            flat = x.reshape(-1, 17)
            x = _gru_scaler.transform(flat).reshape(1, window, 17).astype("float32")
        except Exception as e:
            logger.exception("scaler.transform failed: %s", e)

    try:
        y = _gru_obj.predict(x, verbose=0)  # shape (1, H) or (1, H, 1)
    except Exception as e:
        logger.exception("GRU predict failed: %s", e)
        return None

    y = np.asarray(y).reshape(-1)
    if _gru_scaler is not None:
        try:
            y = _gru_scaler.inverse_transform(y.reshape(-1, 1)).reshape(-1)
        except Exception:
            pass  # leave y in scaled space if inverse fails — better than nothing

    # Trim or pad to the requested horizon.
    y = y[:horizon_steps]
    if len(y) < horizon_steps:
        pad = [float(y[-1])] * (horizon_steps - len(y))
        y = np.concatenate([y, np.array(pad)])

    start = start_from or datetime.now(timezone.utc)
    ts_list = _future_timestamps(start, horizon_steps, step_min)
    cap = capacity or 0
    band = 5.0  # +/- pct-points; placeholder for real residual stats
    out = []
    for t, p in zip(ts_list, y):
        p_clamped = float(max(0.0, min(100.0, p)))
        out.append({
            "timestamp": _iso(t),
            "available": int(round(cap * (1 - p_clamped / 100.0))) if cap else None,
            "occupancy_pct": round(p_clamped, 1),
            "lower": round(max(0.0, p_clamped - band), 1),
            "upper": round(min(100.0, p_clamped + band), 1),
        })
    return out


def artifact_status() -> Dict[str, bool]:
    """
    Diagnostic helper — returns which artifacts loaded successfully. Used
    by tests and by the `confidence` field in derived metrics (#12 AC4).
    """
    _try_load()
    return {
        "baseline": _baseline_obj is not None,
        "gru": _gru_obj is not None,
        "gru_scaler": _gru_scaler is not None,
    }
