"""
Tests for analytics/views.py — the GET /api/analytics/forecast/ endpoint.

Covered acceptance criteria:
    #10 AC1 — valid input returns recent_actuals + baseline + GRU keys.
    #10 AC2 — different lots produce genuinely distinct payloads.
    #10 AC3 — every invalid-input path returns a structured 400 body
              (never 500, never empty body).
    #12 AC3 — the `derived` block has the agreed shape on success.
    #12 AC4 — no recent data still returns 200 with empty actuals.

We monkeypatch `analytics.data_access.recent_actuals` and the forecasters
so the test suite never depends on the real CSV/artifacts being present.
That makes these tests reproducible on a fresh checkout without first
running the export cells.
"""

from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APIClient

from analytics import data_access, forecasting


def _fake_actuals(purdue_code, lookback_min, step_min, as_of=None):
    """Synthetic actuals, deterministic per call."""
    base = as_of or datetime(2026, 4, 29, 12, 0, tzinfo=timezone.utc)
    n = lookback_min // step_min
    return [
        {
            "timestamp": (base - timedelta(minutes=step_min * (n - i))).isoformat().replace("+00:00", "Z"),
            "available": 100 - i * 5,
            "occupied": i * 5,
            "occupancy_pct": float(i * 5),
        }
        for i in range(n)
    ]


def _fake_baseline(*, purdue_code, horizon_min, step_min, capacity, start_from):
    n = max(1, horizon_min // step_min)
    return [
        {
            "timestamp": (start_from + timedelta(minutes=step_min * (i + 1))).isoformat().replace("+00:00", "Z"),
            "available": 50,
            "occupancy_pct": 60.0 + i * 2,
        }
        for i in range(n)
    ]


def _fake_gru(*, purdue_code, horizon_min, step_min, capacity, recent_pcts, start_from):
    n = max(1, horizon_min // step_min)
    return [
        {
            "timestamp": (start_from + timedelta(minutes=step_min * (i + 1))).isoformat().replace("+00:00", "Z"),
            "available": 40,
            "occupancy_pct": 65.0 + i * 3,
            "lower": 60.0 + i * 3,
            "upper": 70.0 + i * 3,
        }
        for i in range(n)
    ]


# Per-lot capacities used by the success tests so AC2 can show them differing.
_LOT_CAPACITY = {"PGH": 953, "PGG": 1240, "PGU": 400}


class ForecastViewSuccessTests(SimpleTestCase):
    """#10 AC1, AC2 + #12 AC3."""

    def setUp(self):
        self.client = APIClient()
        self._orig_actuals = data_access.recent_actuals
        self._orig_capacity = data_access.get_capacity
        self._orig_baseline = forecasting.baseline_forecast
        self._orig_gru = forecasting.gru_forecast
        data_access.recent_actuals = _fake_actuals
        data_access.get_capacity = lambda code: _LOT_CAPACITY.get((code or "").upper())
        forecasting.baseline_forecast = _fake_baseline
        forecasting.gru_forecast = _fake_gru

    def tearDown(self):
        data_access.recent_actuals = self._orig_actuals
        data_access.get_capacity = self._orig_capacity
        forecasting.baseline_forecast = self._orig_baseline
        forecasting.gru_forecast = self._orig_gru

    def _get(self, **params):
        return self.client.get("/api/analytics/forecast/", data=params)

    def test_valid_lot_returns_actuals_baseline_and_gru(self):
        """#10 AC1: recent_actuals + baseline + GRU all populated."""
        r = self._get(lot="PGH", horizon=60)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["recent_actuals"])
        self.assertTrue(body["baseline_forecast"])
        self.assertTrue(body["gru_forecast"])
        # Every actuals point has the agreed schema.
        for p in body["recent_actuals"]:
            self.assertIn("timestamp", p)
            self.assertIn("available", p)
            self.assertIn("occupancy_pct", p)

    def test_two_lots_return_distinct_payloads(self):
        """#10 AC2: lot, name, capacity differ across lots."""
        a = self._get(lot="PGH", horizon=60).json()
        b = self._get(lot="PGG", horizon=60).json()
        c = self._get(lot="PGU", horizon=60).json()
        self.assertNotEqual(a["lot"], b["lot"])
        self.assertNotEqual(a["lot_name"], b["lot_name"])
        self.assertNotEqual(a["capacity"], b["capacity"])
        # Three-way: capacities are distinct, proving per-lot resolution.
        self.assertEqual(len({a["capacity"], b["capacity"], c["capacity"]}), 3)

    def test_derived_block_shape_is_complete(self):
        """#12 AC3: derived has all six keys, no frontend math required."""
        body = self._get(lot="PGH", horizon=60).json()
        derived = body["derived"]
        for key in (
            "current_occupancy_pct",
            "rate_of_change_per_hour",
            "time_to_capacity_min",
            "expected_peak",
            "utilization_trend",
            "confidence",
        ):
            self.assertIn(key, derived)


class ForecastViewErrorTests(SimpleTestCase):
    """#10 AC3: every invalid input returns a structured 400."""

    def setUp(self):
        self.client = APIClient()

    def _get(self, **params):
        return self.client.get("/api/analytics/forecast/", data=params)

    def test_unknown_lot_returns_400(self):
        r = self._get(lot="BOGUS", horizon=60)
        self.assertEqual(r.status_code, 400)
        body = r.json()
        self.assertEqual(body.get("error"), "unknown_lot")

    def test_unmapped_purdue_lot_returns_400_with_reason(self):
        # LOT_R is a real Purdue lot but has no proxy mapping in this prototype.
        r = self._get(lot="LOT_R", horizon=60)
        self.assertEqual(r.status_code, 400)
        body = r.json()
        self.assertEqual(body.get("error"), "unknown_lot")
        self.assertEqual(body.get("reason"), "no_proxy_mapping")

    def test_unsupported_horizon_returns_400(self):
        r = self._get(lot="PGH", horizon=999)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get("error"), "unsupported_horizon")

    def test_missing_horizon_returns_400(self):
        r = self._get(lot="PGH")
        self.assertEqual(r.status_code, 400)
        self.assertNotEqual(r.content, b"")


class ForecastViewEmptyDataTests(SimpleTestCase):
    """#12 AC4: empty actuals -> 200 with empty list, never 500."""

    def setUp(self):
        self.client = APIClient()
        self._orig_actuals = data_access.recent_actuals
        self._orig_baseline = forecasting.baseline_forecast
        self._orig_gru = forecasting.gru_forecast
        data_access.recent_actuals = lambda *a, **kw: []
        forecasting.baseline_forecast = lambda **kw: None
        forecasting.gru_forecast = lambda **kw: None

    def tearDown(self):
        data_access.recent_actuals = self._orig_actuals
        forecasting.baseline_forecast = self._orig_baseline
        forecasting.gru_forecast = self._orig_gru

    def test_lot_with_no_recent_data_returns_empty_actuals_not_500(self):
        r = self.client.get("/api/analytics/forecast/", data={"lot": "PGH", "horizon": 60})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["recent_actuals"], [])
        # Derived contract: nulls instead of exceptions.
        self.assertIsNone(body["derived"]["current_occupancy_pct"])
        self.assertEqual(body["derived"]["confidence"], "low")
