"""
analytics/serializers.py — request validation for the analytics endpoints.

Keeps the view layer thin: every 400 path goes through these serializers
so the response shape on errors is consistent (#10 AC3).
"""

from rest_framework import serializers

from boiler_park_backend.lots import LOT_CODES

from .constants import SUPPORTED_HORIZONS_MIN
from .proxy_mapping import SUPPORTED_PURDUE_LOTS


class ForecastQuerySerializer(serializers.Serializer):
    """Validates ?lot=...&horizon=...&as_of=... for the forecast endpoint."""

    lot = serializers.CharField(required=True)
    horizon = serializers.IntegerField(required=True)
    as_of = serializers.DateTimeField(required=False)

    def validate_lot(self, value: str) -> str:
        code = (value or "").upper()
        if code not in LOT_CODES:
            # Unknown to the entire app, not just analytics. Distinguished
            # from "known but unsupported in prototype" by the validate()
            # cross-field check below.
            raise serializers.ValidationError({
                "error": "unknown_lot",
                "valid": LOT_CODES,
            })
        return code

    def validate_horizon(self, value: int) -> int:
        if value not in SUPPORTED_HORIZONS_MIN:
            raise serializers.ValidationError({
                "error": "unsupported_horizon",
                "supported": list(SUPPORTED_HORIZONS_MIN),
            })
        return int(value)

    def validate(self, attrs: dict) -> dict:
        # Cross-field rule: only Purdue codes that have a proxy mapping
        # are wired into the analytics endpoint for the prototype.
        # Reported as 400 so the frontend treats it like any other invalid
        # input rather than crashing on an empty body.
        code = attrs.get("lot")
        if code and code not in SUPPORTED_PURDUE_LOTS:
            raise serializers.ValidationError({
                "error": "unknown_lot",
                "reason": "no_proxy_mapping",
                "supported": SUPPORTED_PURDUE_LOTS,
            })
        return attrs
