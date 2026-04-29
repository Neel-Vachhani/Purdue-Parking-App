"""
Tests for analytics/derived_metrics.py — User Story #12.

Covered acceptance criteria:
    #12 AC1 — rate of change and time-to-capacity computed correctly.
    #12 AC2 — same input shape with different capacities produces
              proportional time-to-capacity (lot-specific output).
    #12 AC3 — output dict has the agreed shape with all keys present.
    #12 AC4 — empty / flat / missing inputs handled gracefully (no
              exceptions, documented null contract).
"""

from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase

from analytics.derived_metrics import compute_derived


def _series(start_pct, slope_per_step, n=6, step_min=30, capacity=200, base_ts=None):
    """Build a synthetic actuals list rising linearly at slope_per_step %."""
    base_ts = base_ts or datetime(2026, 4, 29, 12, 0, tzinfo=timezone.utc)
    out = []
    for i in range(n):
        pct = start_pct + slope_per_step * i
        ts = base_ts + timedelta(minutes=step_min * i)
        out.append({
            "timestamp": ts.isoformat().replace("+00:00", "Z"),
            "available": int(capacity * (1 - pct / 100.0)),
            "occupied": int(capacity * pct / 100.0),
            "occupancy_pct": pct,
        })
    return out


def _gru(start_pct, slope_per_step, n=6, step_min=30, base_ts=None):
    """Synthetic GRU forecast with the same shape as data_access output."""
    base_ts = base_ts or datetime(2026, 4, 29, 14, 30, tzinfo=timezone.utc)
    return [
        {
            "timestamp": (base_ts + timedelta(minutes=step_min * i)).isoformat().replace("+00:00", "Z"),
            "available": 0,
            "occupancy_pct": min(100.0, max(0.0, start_pct + slope_per_step * (i + 1))),
        }
        for i in range(n)
    ]


class DerivedMetricsShapeTests(SimpleTestCase):
    """#12 AC3: contract on the response shape."""

    def test_output_contains_all_required_keys(self):
        actuals = _series(start_pct=40.0, slope_per_step=2.0)
        out = compute_derived(actuals, _gru(50.0, 2.0), None, capacity=200, step_min=30)
        for key in (
            "current_occupancy_pct",
            "rate_of_change_per_hour",
            "time_to_capacity_min",
            "expected_peak",
            "utilization_trend",
            "confidence",
        ):
            self.assertIn(key, out, msg=f"derived missing required key {key!r}")


class RateOfChangeTests(SimpleTestCase):
    """#12 AC1: rate-of-change matches a simple linear input."""

    def test_rate_of_change_matches_linear_slope(self):
        # 2 pct-points every 30 min == 4 pct-points / hour.
        actuals = _series(start_pct=20.0, slope_per_step=2.0, n=6, step_min=30)
        out = compute_derived(actuals, None, None, capacity=200, step_min=30)
        self.assertAlmostEqual(out["rate_of_change_per_hour"], 4.0, delta=0.05)
        self.assertEqual(out["utilization_trend"], "rising")


class TimeToCapacityTests(SimpleTestCase):
    """#12 AC1 + AC2: time-to-capacity correctness and lot-specificity."""

    def test_time_to_capacity_for_converging_series(self):
        # GRU rises from 80% by 5 pct each 30-min step: hits 100% at step 4
        # (i.e. 4 * 30 = 120 minutes ahead).
        gru = _gru(start_pct=80.0, slope_per_step=5.0, n=8)
        out = compute_derived(_series(70.0, 2.0), gru, None, capacity=200, step_min=30)
        self.assertEqual(out["time_to_capacity_min"], 120)

    def test_non_converging_series_returns_null(self):
        gru = _gru(start_pct=40.0, slope_per_step=1.0, n=4)
        out = compute_derived(_series(40.0, 1.0), gru, None, capacity=200, step_min=30)
        self.assertIsNone(out["time_to_capacity_min"])

    def test_same_pattern_different_inputs_yields_distinct_outputs(self):
        """#12 AC2: distinct GRU shapes -> distinct ttc, regardless of capacity."""
        gru_fast = _gru(start_pct=80.0, slope_per_step=10.0, n=6)
        gru_slow = _gru(start_pct=80.0, slope_per_step=4.0, n=10)
        a = compute_derived(_series(70.0, 2.0), gru_fast, None, capacity=200, step_min=30)
        b = compute_derived(_series(70.0, 2.0), gru_slow, None, capacity=500, step_min=30)
        self.assertNotEqual(a["time_to_capacity_min"], b["time_to_capacity_min"])


class EdgeCaseTests(SimpleTestCase):
    """#12 AC4: empty / flat data handled without exceptions or bad values."""

    def test_empty_actuals_returns_null_contract(self):
        out = compute_derived([], None, None, capacity=None, step_min=30)
        self.assertIsNone(out["current_occupancy_pct"])
        self.assertIsNone(out["rate_of_change_per_hour"])
        self.assertIsNone(out["time_to_capacity_min"])
        self.assertEqual(out["utilization_trend"], "unknown")
        self.assertEqual(out["confidence"], "low")

    def test_flat_series_is_stable_with_zero_slope(self):
        actuals = _series(start_pct=50.0, slope_per_step=0.0, n=6)
        out = compute_derived(actuals, None, None, capacity=200, step_min=30)
        self.assertEqual(out["rate_of_change_per_hour"], 0.0)
        self.assertEqual(out["utilization_trend"], "stable")
        self.assertIsNone(out["time_to_capacity_min"])
