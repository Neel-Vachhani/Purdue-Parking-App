"""
analytics/data_access.py — User Story #10 (recent actuals).

Loads the Aarhus proxy parking dataset once, in-memory, and serves a
"recent actuals" slice for a given Purdue lot code. The dataset is from
2014, so we apply a constant time-shift that maps the dataset's max
timestamp onto wall-clock now — the frontend always sees fresh-looking
data without us touching the underlying file.

Data source (local-only, gitignored):
    Backend/my_project/analytics/artifacts/aarhus_parking.csv

CSV schema:
    vehiclecount, updatetime, _id, totalspaces, garagecode, streamtime

We expose:
    get_capacity(purdue_code)    -> int | None
    recent_actuals(purdue_code, lookback_min, step_min, as_of=None)
        -> list[{"timestamp", "available", "occupied", "occupancy_pct"}]

Acceptance criteria touched:
    #10 AC1 — provides the "recent actuals" series for the response.
    #10 AC2 — different Purdue codes resolve to different Aarhus garages,
              so each lot returns its own historical series.
    #12 AC4 — gracefully returns [] (not a 500) when the CSV is missing
              or the lot has no rows in the requested window.
"""

from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from .proxy_mapping import to_source_garage

logger = logging.getLogger(__name__)


# Resolve the artifact path relative to this file so the module works from
# any cwd (manage.py, pytest, ad-hoc REPL).
_ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
CSV_PATH = os.path.join(_ARTIFACT_DIR, "aarhus_parking.csv")


# Cache lives at module level so repeated requests don't re-parse the CSV.
# A simple lock keeps the first-call load thread-safe under Daphne/Gunicorn.
_load_lock = threading.Lock()
_loaded = False
_by_garage: Dict[str, List[dict]] = {}   # garagecode -> list of dicts sorted by ts
_capacity_by_garage: Dict[str, int] = {} # garagecode -> totalspaces (latest seen)
_dataset_max_ts: Optional[datetime] = None


def _parse_ts(s: str) -> Optional[datetime]:
    """Parse the CSV's '2014-05-22 09:09:04.145' style timestamp into UTC."""
    s = (s or "").strip()
    if not s:
        return None
    # The CSV mixes ".145" microseconds and plain seconds — try both.
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _load_csv() -> None:
    """
    Parse aarhus_parking.csv into per-garage time-sorted lists.
    Idempotent: subsequent calls are no-ops once _loaded is True.
    """
    global _loaded, _dataset_max_ts
    if _loaded:
        return
    with _load_lock:
        if _loaded:
            return
        if not os.path.exists(CSV_PATH):
            # Allowed: the prototype runs without the dataset, just with empty
            # actuals. The view layer translates [] into an empty series in the
            # 200 response (#12 AC4) rather than 500ing.
            logger.warning("aarhus_parking.csv not found at %s; actuals will be empty", CSV_PATH)
            _loaded = True
            return

        # Hand-rolled parsing rather than pandas to keep the dependency surface
        # small (Django + a CSV is enough; pandas would just bloat startup).
        import csv
        per_garage: Dict[str, List[dict]] = {}
        capacity: Dict[str, int] = {}
        max_ts: Optional[datetime] = None
        with open(CSV_PATH, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ts = _parse_ts(row.get("updatetime", ""))
                if ts is None:
                    continue
                garage = (row.get("garagecode") or "").strip().upper()
                if not garage:
                    continue
                try:
                    total = int(row["totalspaces"])
                    used = int(row["vehiclecount"])
                except (KeyError, ValueError, TypeError):
                    continue
                # vehiclecount is occupancy; "available" is what the API exposes.
                available = max(0, total - used)
                per_garage.setdefault(garage, []).append({
                    "ts": ts,
                    "available": available,
                    "occupied": used,
                    "total": total,
                })
                # Track capacity (totalspaces is reported per row; the latest
                # value wins in case the operator changed the lot size).
                capacity[garage] = total
                if max_ts is None or ts > max_ts:
                    max_ts = ts

        for garage, rows in per_garage.items():
            rows.sort(key=lambda r: r["ts"])

        _by_garage.update(per_garage)
        _capacity_by_garage.update(capacity)
        _dataset_max_ts = max_ts
        _loaded = True
        logger.info(
            "Loaded aarhus_parking.csv: %d garages, %d total rows, max_ts=%s",
            len(per_garage), sum(len(v) for v in per_garage.values()), max_ts,
        )


def _time_shift_offset(now_utc: datetime) -> timedelta:
    """
    Constant offset that maps the dataset's max timestamp onto `now_utc`.
    Used to make 2014 data feel "recent" without mutating the underlying
    rows. Returns timedelta(0) if the dataset failed to load.
    """
    _load_csv()
    if _dataset_max_ts is None:
        return timedelta(0)
    return now_utc - _dataset_max_ts


def get_capacity(purdue_code: str) -> Optional[int]:
    """Return the proxy garage's totalspaces for the given Purdue code."""
    _load_csv()
    aarhus = to_source_garage(purdue_code)
    if aarhus is None:
        return None
    return _capacity_by_garage.get(aarhus)


def recent_actuals(
    purdue_code: str,
    lookback_min: int,
    step_min: int,
    as_of: Optional[datetime] = None,
) -> List[dict]:
    """
    Return the most recent `lookback_min` of actual occupancy for the lot
    that proxies `purdue_code`, downsampled to one point every `step_min`.

    Each item:
        {
            "timestamp": ISO-8601 string in UTC,
            "available": int,
            "occupied":  int,
            "occupancy_pct": float (0.0-100.0, rounded to 1 dp),
        }

    `as_of` lets tests and demos pin a deterministic "now". When omitted,
    we use real wall-clock UTC and time-shift the dataset so the latest
    Aarhus row maps onto that wall-clock time.

    Returns [] (not None, not exception) when:
        - the lot code has no proxy mapping,
        - the CSV is missing,
        - the lot has no rows in the requested window.
    The view layer relies on this contract for #12 AC4.
    """
    _load_csv()
    aarhus = to_source_garage(purdue_code)
    if aarhus is None:
        return []
    rows = _by_garage.get(aarhus)
    if not rows:
        return []

    now_utc = (as_of or datetime.now(timezone.utc)).astimezone(timezone.utc)
    shift = _time_shift_offset(now_utc)
    window_start = now_utc - timedelta(minutes=lookback_min)

    # Walk the sorted rows and pick the last entry inside each step bucket.
    # This is cheap because rows is already time-ordered.
    bucket_size = timedelta(minutes=step_min)
    bucketed: Dict[datetime, dict] = {}
    for r in rows:
        shifted = r["ts"] + shift
        if shifted < window_start or shifted > now_utc:
            continue
        # Snap to the start of the step bucket for deterministic timestamps.
        anchor = window_start + bucket_size * int((shifted - window_start) / bucket_size)
        bucketed[anchor] = r  # later row in the same bucket wins

    out: List[dict] = []
    for anchor in sorted(bucketed.keys()):
        r = bucketed[anchor]
        total = r["total"] or 1
        occ_pct = round(100.0 * r["occupied"] / total, 1)
        out.append({
            "timestamp": anchor.isoformat().replace("+00:00", "Z"),
            "available": r["available"],
            "occupied": r["occupied"],
            "occupancy_pct": occ_pct,
        })
    return out
