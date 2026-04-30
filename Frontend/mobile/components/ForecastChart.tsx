// components/ForecastChart.tsx
//
// Line chart showing recent actuals + predicted occupancy over time.
// Renders inside the Garage Detail view's Occupancy section.
//
// Uses react-native-svg for drawing (already in most Expo projects).
// Falls back gracefully if svg is not available.

import React, { useContext, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";
import { Ionicons } from "./ThemedIcons";
import type { ResolvedForecast } from "../utils/useForecast";

let Svg: any, Path: any, Circle: any, Line: any, G: any, Rect: any, SvgText: any;
try {
  const svg = require("react-native-svg");
  Svg = svg.Svg;
  Path = svg.Path;
  Circle = svg.Circle;
  Line = svg.Line;
  G = svg.G;
  Rect = svg.Rect;
  SvgText = svg.Text;
} catch {
  // SVG not available — component will render a text fallback
}

interface Props {
  forecast: ResolvedForecast;
}


function formatHour(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "p" : "a";
    const h12 = h % 12 || 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
  } catch {
    return "";
  }
}

function barColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  if (pct >= 40) return "#3b82f6";
  return "#22c55e";
}

// ── Component ─────────────────────────────────────────────

export default function ForecastChart({ forecast }: Props) {
  const theme = useContext(ThemeContext);
  const isDark = theme.mode === "dark";
  const textMuted = theme.textMuted ?? (isDark ? "#9ca3af" : "#6b7280");
  const cardBg = isDark ? "#1e1f23" : "#f9fafb";
  const cardBorder = isDark ? "#2a2d33" : "#e5e7eb";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // Combine actuals + forecast into one timeline
  const { actualsPoints, forecastPoints, allPoints, peakPoint, nowIndex } = useMemo(() => {
    const actuals = (forecast.raw.recent_actuals ?? []).map((a) => ({
      timestamp: a.timestamp,
      pct: a.occupancy_pct,
      available: a.available,
      type: "actual" as const,
    }));

    const preds = (forecast.forecast ?? []).map((f) => ({
      timestamp: f.timestamp,
      pct: f.occupancy_pct,
      available: f.available,
      type: "forecast" as const,
    }));

    const all = [...actuals, ...preds];

    // Find peak in forecast
    let peak = preds[0] ?? null;
    for (const p of preds) {
      if (p && (!peak || p.pct > peak.pct)) peak = p;
    }

    return {
      actualsPoints: actuals,
      forecastPoints: preds,
      allPoints: all,
      peakPoint: peak,
      nowIndex: actuals.length - 1,
    };
  }, [forecast]);

  // Chart dimensions
  const screenWidth = Dimensions.get("window").width;
  const CHART_W = screenWidth - 64; // padding
  const CHART_H = 140;
  const PADDING_LEFT = 32;
  const PADDING_RIGHT = 8;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 24;
  const plotW = CHART_W - PADDING_LEFT - PADDING_RIGHT;
  const plotH = CHART_H - PADDING_TOP - PADDING_BOTTOM;

  // Scale
  const maxPct = Math.max(100, ...allPoints.map((p) => p.pct));
  const minPct = 0;
  const xScale = (i: number) => PADDING_LEFT + (i / Math.max(1, allPoints.length - 1)) * plotW;
  const yScale = (pct: number) => PADDING_TOP + plotH - ((pct - minPct) / (maxPct - minPct)) * plotH;

  // Build SVG paths
  const buildPath = (points: typeof allPoints, startIdx: number) => {
    if (!points.length) return "";
    return points
      .map((p, i) => {
        const x = xScale(startIdx + i);
        const y = yScale(p.pct);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const actualsPath = buildPath(actualsPoints, 0);
  const forecastPath = buildPath(forecastPoints, actualsPoints.length);

  // Confidence band path (filled area)
  const bandPath = useMemo(() => {
    if (!forecast.forecast?.length) return "";
    const steps = forecast.forecast;
    const startIdx = actualsPoints.length;
    const upper = steps.map((s, i) => {
      const x = xScale(startIdx + i);
      const y = yScale(Math.min(100, s.upper ?? s.occupancy_pct + 5));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const lower = steps.map((s, i) => {
      const idx = steps.length - 1 - i;
      const x = xScale(startIdx + idx);
      const y = yScale(Math.max(0, steps[idx].lower ?? steps[idx].occupancy_pct - 5));
      return `L${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `${upper} ${lower} Z`;
  }, [forecast.forecast, actualsPoints.length]);

  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(allPoints.length / 6));
    return allPoints
      .filter((_, i) => i % step === 0 || i === allPoints.length - 1)
      .map((p, _, arr) => ({
        label: formatHour(p.timestamp),
        x: xScale(allPoints.indexOf(p)),
      }));
  }, [allPoints]);

  const yLabels = [0, 25, 50, 75, 100].filter((v) => v <= maxPct);

  const derived = forecast.derived;
  const trendIcon = derived.utilization_trend === "increasing" ? "trending-up"
    : derived.utilization_trend === "decreasing" ? "trending-down" : "remove";
  const trendColor = derived.utilization_trend === "increasing" ? "#f59e0b"
    : derived.utilization_trend === "decreasing" ? "#22c55e" : textMuted;
    
  if (!Svg) {
    return (
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={s.header}>
          <Ionicons name="analytics-outline" size={18} color={theme.text} />
          <Text style={[s.headerTitle, { color: theme.text }]}>Predicted Occupancy</Text>
        </View>
        <Text style={{ color: textMuted, fontSize: 12 }}>
          Install react-native-svg to see the occupancy chart.
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={s.header}>
        <Ionicons name="analytics-outline" size={18} color={theme.text} />
        <Text style={[s.headerTitle, { color: theme.text }]}>Predicted Occupancy</Text>
        <View style={{
          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
          backgroundColor: forecast.source === "baseline"
            ? (isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)")
            : (isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"),
        }}>
          <Text style={{
            fontSize: 9, fontWeight: "700",
            color: forecast.source === "baseline" ? "#f59e0b" : "#3b82f6",
          }}>
            {forecast.source === "baseline" ? "BASELINE" : "GRU"}
          </Text>
        </View>
      </View>

      <Svg width={CHART_W} height={CHART_H}>
        {yLabels.map((v) => (
          <G key={`grid-${v}`}>
            <Line
              x1={PADDING_LEFT} y1={yScale(v)}
              x2={CHART_W - PADDING_RIGHT} y2={yScale(v)}
              stroke={gridColor} strokeWidth={1}
            />
            <SvgText
              x={PADDING_LEFT - 4} y={yScale(v) + 3}
              fontSize={9} fill={textMuted} textAnchor="end"
            >
              {v}%
            </SvgText>
          </G>
        ))}

        {bandPath ? (
          <Path d={bandPath} fill={isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)"} />
        ) : null}

        {nowIndex >= 0 && nowIndex < allPoints.length && (
          <Line
            x1={xScale(nowIndex)} y1={PADDING_TOP}
            x2={xScale(nowIndex)} y2={CHART_H - PADDING_BOTTOM}
            stroke={textMuted} strokeWidth={1} strokeDasharray="3,3"
          />
        )}

        {actualsPath ? (
          <Path d={actualsPath} fill="none" stroke={theme.text} strokeWidth={2} strokeLinecap="round" />
        ) : null}

        {forecastPath ? (
          <Path d={forecastPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeDasharray="6,3" />
        ) : null}

        {/* Current point dot */}
        {nowIndex >= 0 && nowIndex < allPoints.length && (
          <Circle
            cx={xScale(nowIndex)} cy={yScale(allPoints[nowIndex].pct)}
            r={4} fill={barColor(allPoints[nowIndex].pct)} stroke="#fff" strokeWidth={1.5}
          />
        )}

        {/* Peak dot */}
        {peakPoint && forecastPoints.length > 0 && (
          <Circle
            cx={xScale(actualsPoints.length + forecastPoints.indexOf(peakPoint))}
            cy={yScale(peakPoint.pct)}
            r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5}
          />
        )}

        {/* X-axis labels */}
        {xLabels.map((lbl, i) => (
          <SvgText
            key={`x-${i}`}
            x={lbl.x} y={CHART_H - 4}
            fontSize={9} fill={textMuted} textAnchor="middle"
          >
            {lbl.label}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendLine, { backgroundColor: theme.text }]} />
          <Text style={[s.legendText, { color: textMuted }]}>Actual</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendLine, { backgroundColor: "#3b82f6", borderStyle: "dashed" }]} />
          <Text style={[s.legendText, { color: textMuted }]}>Predicted</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#f59e0b" }]} />
          <Text style={[s.legendText, { color: textMuted }]}>Peak</Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={[s.metricsRow, { borderTopColor: cardBorder }]}>
        {derived.current_occupancy_pct != null && (
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: barColor(derived.current_occupancy_pct) }]}>
              {Math.round(derived.current_occupancy_pct)}%
            </Text>
            <Text style={[s.metricLabel, { color: textMuted }]}>Now</Text>
          </View>
        )}
        {peakPoint && (
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: "#f59e0b" }]}>
              {Math.round(peakPoint.pct)}%
            </Text>
            <Text style={[s.metricLabel, { color: textMuted }]}>Peak</Text>
          </View>
        )}
        <View style={s.metric}>
          <Ionicons name={trendIcon as any} size={16} color={trendColor} />
          <Text style={[s.metricLabel, { color: textMuted }]}>
            {derived.utilization_trend === "increasing" ? "Rising"
              : derived.utilization_trend === "decreasing" ? "Falling" : "Stable"}
          </Text>
        </View>
        {derived.time_to_capacity_min != null && (
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: "#ef4444" }]}>
              {derived.time_to_capacity_min}m
            </Text>
            <Text style={[s.metricLabel, { color: textMuted }]}>To full</Text>
          </View>
        )}
      </View>

      {/* Insights */}
      {forecast.insights.length > 0 && (
        <View style={s.insightsContainer}>
          {forecast.insights.slice(0, 2).map((ins, i) => {
            const bg = ins.severity === "alert" ? "#ef444418" : ins.severity === "warn" ? "#f59e0b18" : "#3b82f618";
            const fg = ins.severity === "alert" ? "#ef4444" : ins.severity === "warn" ? "#f59e0b" : "#3b82f6";
            const icon = ins.severity === "alert" ? "warning" : ins.severity === "warn" ? "alert-circle" : "information-circle";
            return (
              <View key={i} style={[s.insightPill, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={13} color={fg} />
                <Text style={[s.insightText, { color: fg }]}>{ins.message}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Confidence */}
      {derived.confidence != null && (
        <Text style={{ fontSize: 10, color: textMuted, marginTop: 6, textAlign: "right" }}>
          Confidence: {Math.round(derived.confidence * 100)}%
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendLine: { width: 16, height: 2, borderRadius: 1 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: "600" },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metric: { alignItems: "center", gap: 2 },
  metricValue: { fontSize: 16, fontWeight: "800" },
  metricLabel: { fontSize: 10, fontWeight: "600" },
  insightsContainer: { marginTop: 10, gap: 6 },
  insightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  insightText: { fontSize: 11, fontWeight: "600", flex: 1 },
});
