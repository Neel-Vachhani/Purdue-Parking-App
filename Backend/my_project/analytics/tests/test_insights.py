"""
Tests for analytics/insights.py — User Story #11.

Covered acceptance criteria:
    #11 AC1 — every produced summary is short, plain English, no jargon.
    #11 AC2 — filling-fast / unusual-demand / near-full conditions each
              trigger their dedicated insight when the data warrants.
    #11 AC3 — output is capped at MAX_INSIGHTS and ordered by severity,
              keeping the panel concise and decision-relevant.
"""

import re

from django.test import SimpleTestCase

from analytics.constants import MAX_INSIGHTS
from analytics.insights import generate_insights


def _payload(*, actuals=None, gru=None, baseline=None, derived=None, horizon=60, lot="PGH"):
    """Build a minimal analytics payload for a rule under test."""
    return {
        "lot": lot,
        "lot_name": "Harrison Street Parking Garage",
        "horizon_minutes": horizon,
        "step_minutes": 30,
        "recent_actuals": actuals or [],
        "baseline_forecast": baseline,
        "gru_forecast": gru,
        "derived": derived or {},
    }


def _series(pcts):
    """Build an actuals list from a list of occupancy percentages."""
    return [
        {"timestamp": f"2026-04-29T12:{i:02d}:00Z", "available": 0,
         "occupied": 0, "occupancy_pct": float(p)}
        for i, p in enumerate(pcts)
    ]


def _forecast(pcts):
    return [
        {"timestamp": f"2026-04-29T13:{i:02d}:00Z", "available": 0,
         "occupancy_pct": float(p)}
        for i, p in enumerate(pcts)
    ]


_JARGON_RE = re.compile(r"\b(GRU|residual|slope|RNN|LSTM|MAE|MSE)\b", re.IGNORECASE)


class ReadabilityTests(SimpleTestCase):
    """#11 AC1 + AC3: every emitted message is short and human."""

    def test_summaries_are_short_and_readable(self):
        payload = _payload(
            actuals=_series([95.0]),
            gru=_forecast([96, 97, 98, 99, 100, 100]),
            baseline=_forecast([60, 60, 60, 60, 60, 60]),
            derived={"time_to_capacity_min": 120, "rate_of_change_per_hour": 8.0,
                     "utilization_trend": "rising"},
            horizon=180,
        )
        out = generate_insights(payload)
        self.assertGreaterEqual(len(out), 1)
        for insight in out:
            msg = insight["message"]
            self.assertLessEqual(len(msg), 140, msg=f"too long: {msg}")
            self.assertTrue(msg.endswith("."), msg=f"no terminal period: {msg}")
            self.assertIsNone(_JARGON_RE.search(msg), msg=f"jargon present: {msg}")


class TriggerTests(SimpleTestCase):
    """#11 AC2: each documented condition fires its dedicated rule."""

    def test_near_capacity_triggers_near_full(self):
        out = generate_insights(_payload(actuals=_series([93.0])))
        codes = {i["code"] for i in out}
        self.assertIn("near_full", codes)

    def test_filling_fast_payload_triggers_filling_insight(self):
        # GRU adds 12 pct-points within ~30 min from current 60% actual.
        out = generate_insights(_payload(
            actuals=_series([60.0]),
            gru=_forecast([66.0, 72.0, 78.0]),
        ))
        codes = {i["code"] for i in out}
        self.assertIn("filling_fast", codes)

    def test_anomalous_vs_baseline_triggers_unusual_demand(self):
        out = generate_insights(_payload(
            actuals=_series([55.0] * 6),
            gru=_forecast([55, 60, 70, 80, 85, 88]),
            baseline=_forecast([55, 55, 55, 55, 55, 55]),
        ))
        codes = {i["code"] for i in out}
        self.assertIn("unusual_demand", codes)

    def test_quiet_lot_triggers_info(self):
        out = generate_insights(_payload(
            actuals=_series([20.0] * 6),
            derived={"utilization_trend": "stable"},
        ))
        codes = {i["code"] for i in out}
        self.assertIn("quiet", codes)


class CappingTests(SimpleTestCase):
    """#11 AC3: at most MAX_INSIGHTS, ordered alert > warn > info."""

    def test_payload_caps_at_three_insights_ordered_by_severity(self):
        # Construct a payload that triggers >= 4 rules at once.
        payload = _payload(
            actuals=_series([95.0]),  # near_full -> alert
            gru=_forecast([95, 99, 100, 100]),  # filling_fast -> warn (delta vs current)
            baseline=_forecast([55, 55, 55, 55]),  # unusual_demand -> warn
            derived={"time_to_capacity_min": 60, "rate_of_change_per_hour": 12.0,
                     "utilization_trend": "rising"},
            horizon=120,
        )
        out = generate_insights(payload)
        self.assertLessEqual(len(out), MAX_INSIGHTS)
        # Severity must be non-decreasing through the list.
        order = ["alert", "warn", "info"]
        positions = [order.index(i["severity"]) for i in out]
        self.assertEqual(positions, sorted(positions))
