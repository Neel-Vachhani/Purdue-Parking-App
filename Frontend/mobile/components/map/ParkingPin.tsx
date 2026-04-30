import React from "react";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

// ─── Availability helpers ────────────────────────────────────────────────────

/** Returns a traffic-light color based on the fraction of spots still available. */
function availabilityDotColor(available?: number, capacity?: number): string {
  if (available === undefined || capacity === undefined || capacity === 0) {
    return "#94A3B8"; // unknown – slate
  }
  const pct = available / capacity;
  if (pct > 0.4) return "#22C55E"; // green  – plenty of space
  if (pct > 0.15) return "#F59E0B"; // amber  – getting full
  return "#EF4444";                 // red    – nearly full
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ParkingPinProps {
  /** Whether this pin is currently selected (callout open). */
  isSelected: boolean;
  /** Live available-spot count from the API / WebSocket. */
  available?: number;
  /** Total capacity of the lot. */
  capacity?: number;
  /** Dark-mode flag so the unselected pin adjusts contrast. */
  isDark?: boolean;
}

/**
 * SVG map pin rendered as a custom react-native-maps Marker child.
 *
 * Layout (viewBox 0 0 26 36):
 *   • Teardrop body     – Purdue gold fill, darker when unselected
 *   • "P" label         – centred in the circular head of the teardrop
 *   • Availability dot  – top-right corner, traffic-light colour
 */
export default function ParkingPin({
  isSelected,
  available,
  capacity,
  isDark = false,
}: ParkingPinProps) {
  const dotColor = availabilityDotColor(available, capacity);

  // Sizing
  const width = isSelected ? 44 : 32;
  const height = isSelected ? 58 : 42; // preserves viewBox 26 : 36 ratio (≈ 1.38)

  // Pin body colours
  const pinFill = isSelected ? "#CFB991" : isDark ? "#9E8060" : "#B5975A";
  const pinStroke = isSelected ? "#FFFFFF" : "#0E0F11";
  const strokeWidth = isSelected ? 2 : 1;

  // Teardrop path in viewBox 0 0 26 36
  // Head: circle centred at (13, 12) with r≈11; tail tapers to point at (13, 35).
  const pinPath =
    "M13 1 C6.925 1 2 5.925 2 12 C2 20 13 35 13 35 C13 35 24 20 24 12 C24 5.925 19.075 1 13 1 Z";

  return (
    <Svg width={width} height={height} viewBox="0 0 26 36">
      {/* Teardrop body */}
      <Path
        d={pinPath}
        fill={pinFill}
        stroke={pinStroke}
        strokeWidth={strokeWidth}
      />

      {/* "P" label – centred in the head */}
      <SvgText
        x="13"
        y="17"
        textAnchor="middle"
        fill="#0E0F11"
        fontSize={isSelected ? 9 : 8}
        fontWeight="bold"
      >
        P
      </SvgText>

      {/* Availability dot – top-right of the head */}
      <Circle
        cx="21"
        cy="6"
        r="3.5"
        fill={dotColor}
        stroke="#FFFFFF"
        strokeWidth="1"
      />
    </Svg>
  );
}
