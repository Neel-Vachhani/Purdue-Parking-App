"""
Tests for analytics/proxy_mapping.py — Purdue<->Aarhus proxy layer.

Covered acceptance criteria:
    #10 AC2 — distinct lots resolve to distinct Aarhus garages
              (proves data is genuinely per-lot).
    #10 AC3 — codes without a mapping resolve to None, which the
              serializer turns into a structured 400.
"""

from django.test import SimpleTestCase

from analytics.proxy_mapping import (
    PURDUE_TO_AARHUS,
    SUPPORTED_PURDUE_LOTS,
    is_supported,
    to_source_garage,
)
from boiler_park_backend.lots import LOT_CODES


# Aarhus garages present in the dataset (aarhus_parking.csv).
_AARHUS_GARAGES = {
    "BRUUNS", "BUSGADEHUSET", "KALKVAERKSVEJ", "MAGASIN",
    "NORREPORT", "SALLING", "SCANDCENTER", "SKOLEBAKKEN",
}


class ProxyMappingTests(SimpleTestCase):
    """Validates the Purdue<->Aarhus mapping itself, no I/O."""

    def test_every_purdue_key_is_a_real_lot_code(self):
        """#10 AC2: mapping keys must exist in the canonical PARKING_LOTS list."""
        for code in PURDUE_TO_AARHUS.keys():
            self.assertIn(code, LOT_CODES, msg=f"Purdue code {code!r} is not in LOT_CODES")

    def test_every_aarhus_value_is_a_known_garage(self):
        """#10 AC2: mapping values must be Aarhus garages that exist in the CSV."""
        for code, garage in PURDUE_TO_AARHUS.items():
            self.assertIn(garage, _AARHUS_GARAGES, msg=f"{code} -> {garage} is not an Aarhus garage")

    def test_mapping_is_injective(self):
        """#10 AC2: two Purdue codes must not share an Aarhus garage."""
        garages = list(PURDUE_TO_AARHUS.values())
        self.assertEqual(len(garages), len(set(garages)), msg="duplicate Aarhus garage in mapping")

    def test_to_source_garage_is_case_insensitive(self):
        """API consumers may send lowercase codes; mapping must still resolve."""
        self.assertEqual(to_source_garage("pgh"), to_source_garage("PGH"))
        self.assertEqual(to_source_garage("PgH"), "BRUUNS")

    def test_unmapped_lot_returns_none(self):
        """#10 AC3: a Purdue lot without a proxy entry returns None."""
        self.assertIsNone(to_source_garage("LOT_R"))
        self.assertFalse(is_supported("LOT_R"))

    def test_supported_list_matches_keys(self):
        """SUPPORTED_PURDUE_LOTS is the contract surfaced to the serializer."""
        self.assertEqual(set(SUPPORTED_PURDUE_LOTS), set(PURDUE_TO_AARHUS.keys()))
