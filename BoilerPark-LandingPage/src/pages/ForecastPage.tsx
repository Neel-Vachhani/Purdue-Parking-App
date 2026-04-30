import { motion } from "framer-motion";
import { ArrowLeft, Calendar, DollarSign, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import logo from "../assets/boilerpark-logo.png";

// ── Types ──────────────────────────────────────────────────────────────────

type LotKey = "chauncey" | "garage" | "gateway" | "grant" | "stadium" | "corec";
type RevenueScenario = "base" | "price_hike" | "high_demand" | "low_demand";
type EventKey = "football" | "commencement" | "spring_break" | "construction";

// ── US-13: Demand Forecasting Data ─────────────────────────────────────────

// 16 hours: 6am – 9pm
const FCAST_HOURS = ["6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p"];
const FCAST_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const LOT_CONFIG: Record<LotKey, { label: string; capacity: number; color: string }> = {
  chauncey: { label: "Chauncey Hill",  capacity: 420, color: "#cfb991" },
  garage:   { label: "Parking Garage", capacity: 680, color: "#60a5fa" },
  gateway:  { label: "Gateway Garage", capacity: 510, color: "#34d399" },
  grant:    { label: "Grant St Lot",   capacity: 280, color: "#f472b6" },
  stadium:  { label: "Stadium Lot",    capacity: 950, color: "#fb923c" },
  corec:    { label: "CoRec Lot",      capacity: 340, color: "#a78bfa" },
};

// DEMAND_MATRIX[lot][day 0=Mon][hour 0=6am] → occupancy %
const DEMAND_MATRIX: Record<LotKey, number[][]> = {
  chauncey: [
    [ 8,14,52,78,85,87,83,79,81,84,82,78,64,46,30,18], // Mon
    [ 8,15,54,80,86,88,84,80,82,85,83,79,65,47,31,19], // Tue
    [ 7,13,50,76,83,85,81,77,79,82,80,76,62,44,28,17], // Wed
    [ 9,15,55,81,87,89,85,81,83,86,84,80,66,48,32,20], // Thu
    [10,16,57,83,89,91,87,83,85,87,85,82,73,56,36,22], // Fri
    [ 6, 9,16,28,38,42,40,36,32,28,24,19,14,10, 7, 5], // Sat
    [ 4, 6,10,15,20,23,22,19,16,13,11, 9, 7, 5, 4, 3], // Sun
  ],
  garage: [
    [ 6,12,55,82,88,90,86,82,84,87,85,80,68,50,32,16],
    [ 6,13,57,84,89,91,87,83,85,88,86,81,69,51,33,17],
    [ 5,11,53,80,86,88,84,80,82,85,83,78,66,48,30,15],
    [ 7,13,58,85,90,92,88,84,86,89,87,82,70,52,34,18],
    [ 8,15,61,87,92,94,90,86,88,90,88,84,77,60,38,20],
    [ 5, 8,18,32,44,48,46,42,38,32,26,20,15,10, 7, 4],
    [ 3, 5,10,16,22,26,24,21,18,15,12, 9, 7, 5, 3, 2],
  ],
  gateway: [
    [10,16,44,68,74,76,73,70,72,74,72,68,62,48,32,20],
    [10,17,46,70,75,77,74,71,73,75,73,69,63,49,33,21],
    [ 9,15,42,66,72,74,71,68,70,72,70,66,60,46,30,18],
    [11,17,47,71,76,78,75,72,74,76,74,70,64,50,34,22],
    [12,18,49,73,78,80,77,74,76,78,76,72,68,54,36,24],
    [ 8,12,22,36,48,52,50,46,42,36,30,24,18,12, 8, 5],
    [ 5, 8,14,22,30,34,33,30,26,22,18,14,10, 7, 5, 3],
  ],
  grant: [
    [ 4, 9,44,78,88,88,80,74,76,80,78,85,60,38,18, 8],
    [ 4,10,46,80,89,89,81,75,77,81,79,86,61,39,19, 8],
    [ 3, 8,42,76,86,86,78,72,74,78,76,83,58,36,16, 7],
    [ 5,10,47,81,90,90,82,76,78,82,80,87,62,40,20, 9],
    [ 6,11,49,83,92,92,84,78,80,84,82,89,68,48,24,10],
    [ 3, 5,10,18,24,26,24,21,18,14,11, 8, 6, 4, 3, 2],
    [ 2, 3, 7,12,15,17,16,14,12,10, 8, 6, 4, 3, 2, 1],
  ],
  stadium: [
    [ 5, 7,16,28,38,40,38,35,34,36,37,42,36,26,16, 8],
    [ 5, 7,17,29,39,41,39,36,35,37,38,43,37,27,17, 8],
    [ 4, 6,15,27,37,39,37,34,33,35,36,41,35,25,15, 7],
    [ 5, 8,17,30,40,42,40,37,36,38,39,44,38,28,17, 8],
    [ 6, 9,19,32,42,44,42,39,38,40,41,46,42,32,20,10],
    [ 4, 6,12,22,34,40,42,40,38,36,34,36,32,24,14, 7],
    [ 4, 5,10,18,28,34,36,34,32,30,28,30,26,18,10, 5],
  ],
  corec: [
    [14,18,32,50,58,60,58,56,60,66,72,76,80,78,72,58],
    [14,19,33,51,59,61,59,57,61,67,73,77,81,79,73,59],
    [13,17,31,49,57,59,57,55,59,65,71,75,79,77,71,57],
    [15,19,34,52,60,62,60,58,62,68,74,78,82,80,74,60],
    [14,18,33,50,58,62,60,58,62,68,74,78,84,82,76,62],
    [10,14,24,38,48,54,56,56,58,60,62,65,68,66,60,45],
    [ 8,11,18,28,36,42,46,48,50,52,54,56,58,55,48,35],
  ],
};

function demandColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 100));
  const r = Math.round(18 + t * 189);
  const g = Math.round(24 + t * 161);
  const b = Math.round(46 + t * 99);
  const a = (0.22 + t * 0.78).toFixed(2);
  return `rgba(${r},${g},${b},${a})`;
}

function staffingLabel(peak: number): { text: string; color: string } {
  if (peak >= 85) return { text: "High — 3–4 staff", color: "#f87171" };
  if (peak >= 65) return { text: "Moderate — 2–3 staff", color: "#fbbf24" };
  if (peak >= 45) return { text: "Standard — 2 staff", color: "#cfb991" };
  return { text: "Minimal — 1 staff", color: "#34d399" };
}

// ── US-14: Revenue Projection Data ─────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
const BASE_DAILY = [12400, 14800, 11200, 15600, 18900, 8200, 6100];
const BASE_WEEKLY = [87200, 91500, 89300, 94100, 96800, 98200, 95700, 101400];

const SCENARIO_CONFIG: Record<
  RevenueScenario,
  { label: string; multiplier: number; accentColor: string; chipActive: string; chipInactive: string }
> = {
  base: {
    label: "Base",
    multiplier: 1.0,
    accentColor: "#cfb991",
    chipActive: "bg-[var(--bp-accent)] text-[var(--bp-accent-ink)] border-transparent",
    chipInactive:
      "border border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-[var(--bp-accent)]",
  },
  price_hike: {
    label: "Price +10%",
    multiplier: 1.1,
    accentColor: "#60a5fa",
    chipActive: "bg-blue-500/25 text-blue-100 border border-blue-300/40",
    chipInactive:
      "border border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-blue-300/40",
  },
  high_demand: {
    label: "High Demand +25%",
    multiplier: 1.25,
    accentColor: "#34d399",
    chipActive: "bg-emerald-500/20 text-emerald-100 border border-emerald-300/40",
    chipInactive:
      "border border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-emerald-300/40",
  },
  low_demand: {
    label: "Low Demand −28%",
    multiplier: 0.72,
    accentColor: "#f87171",
    chipActive: "bg-red-500/20 text-red-100 border border-red-300/40",
    chipInactive:
      "border border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-red-300/40",
  },
};

// ── US-15: Event Impact Data ────────────────────────────────────────────────

const LOTS = ["Chauncey", "Garage", "Gateway", "Grant St", "Stadium", "CoRec"];
const NORMAL_OCCUPANCY = [72, 68, 61, 58, 45, 55];
const TIMELINE_HOURS = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];
const NORMAL_TIMELINE = [52, 61, 68, 72, 74, 73, 71, 69, 74, 75, 58, 42];

type EventConfig = {
  name: string;
  shortLabel: string;
  date: string;
  description: string;
  peakChange: string;
  lotsAffected: number;
  peakHour: string;
  duration: string;
  eventOccupancy: number[];
  timelineEvent: number[];
};

const EVENT_CONFIG: Record<EventKey, EventConfig> = {
  football: {
    name: "Football Game (vs. Indiana)",
    shortLabel: "Football",
    date: "Nov 2, 2024",
    description: "Home game at Ross-Ade. Expect major influx near stadium lots from 12pm–6pm.",
    peakChange: "+82%",
    lotsAffected: 6,
    peakHour: "1:00 PM",
    duration: "~6 hours",
    eventOccupancy: [95, 92, 78, 68, 99, 88],
    timelineEvent: [54, 63, 71, 88, 96, 99, 98, 94, 78, 62, 52, 44],
  },
  commencement: {
    name: "Spring Commencement",
    shortLabel: "Commencement",
    date: "May 10, 2025",
    description: "University-wide graduation at Mackey Arena. Heavy family traffic 9am–3pm.",
    peakChange: "+55%",
    lotsAffected: 5,
    peakHour: "10:30 AM",
    duration: "~5 hours",
    eventOccupancy: [88, 94, 72, 60, 76, 91],
    timelineEvent: [55, 81, 93, 95, 91, 82, 72, 61, 56, 52, 46, 40],
  },
  spring_break: {
    name: "Spring Break",
    shortLabel: "Spring Break",
    date: "Mar 8–15, 2025",
    description: "Campus near-empty. Revenue and occupancy significantly reduced across all lots.",
    peakChange: "−72%",
    lotsAffected: 6,
    peakHour: "N/A",
    duration: "1 week",
    eventOccupancy: [28, 22, 31, 18, 12, 24],
    timelineEvent: [18, 22, 25, 28, 31, 30, 29, 27, 28, 26, 18, 14],
  },
  construction: {
    name: "Grant St Road Closure",
    shortLabel: "Grant St Closure",
    date: "Nov 15–30, 2024",
    description: "Temporary closure reroutes traffic. Expect overflow to adjacent lots.",
    peakChange: "+32%",
    lotsAffected: 4,
    peakHour: "5:00 PM",
    duration: "2 weeks",
    eventOccupancy: [72, 68, 99, 94, 48, 61],
    timelineEvent: [55, 65, 72, 78, 82, 86, 84, 80, 88, 92, 70, 51],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── SVG Chart Components ───────────────────────────────────────────────────

const SVG_W = 560;
const PAD_B = 28;
const PAD_T = 14;
const PAD_LR = 8;

// Demand heatmap: rows = hours, columns = days
function HeatmapChart({
  matrix,
  selectedDay,
  onDayClick,
  accentColor,
}: {
  matrix: number[][];
  selectedDay: number;
  onDayClick: (d: number) => void;
  accentColor: string;
}) {
  const VW = 580;
  const VH = 316;
  const LEFT = 36;
  const TOP = 26;
  const RIGHT = 6;
  const BOT = 8;
  const cw = (VW - LEFT - RIGHT) / 7;
  const rh = (VH - TOP - BOT) / 16;
  const GAP = 1.5;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: "pointer" }}
    >
      {/* Day column labels */}
      {FCAST_DAYS.map((d, di) => (
        <text
          key={di}
          x={LEFT + di * cw + cw / 2}
          y={TOP - 8}
          textAnchor="middle"
          fontSize={10}
          fill={selectedDay === di ? accentColor : "rgba(248,247,244,0.5)"}
          fontWeight={selectedDay === di ? 700 : 400}
        >
          {d}
        </text>
      ))}

      {/* Hour row labels */}
      {FCAST_HOURS.map((h, hi) => (
        <text
          key={hi}
          x={LEFT - 4}
          y={TOP + hi * rh + rh / 2 + 3.5}
          textAnchor="end"
          fontSize={8.5}
          fill="rgba(248,247,244,0.42)"
        >
          {h}
        </text>
      ))}

      {/* Heatmap cells */}
      {matrix.map((dayData, di) =>
        dayData.map((v, hi) => (
          <rect
            key={`${di}-${hi}`}
            x={LEFT + di * cw + GAP / 2}
            y={TOP + hi * rh + GAP / 2}
            width={cw - GAP}
            height={rh - GAP}
            fill={demandColor(v)}
            rx={2}
            opacity={selectedDay === di ? 1 : 0.7}
            onClick={() => onDayClick(di)}
          />
        )),
      )}

      {/* Selected day border */}
      <rect
        x={LEFT + selectedDay * cw + GAP / 2 - 1}
        y={TOP - 2}
        width={cw - GAP + 2}
        height={16 * rh + 4}
        fill="none"
        stroke={accentColor}
        strokeWidth={1.5}
        rx={3}
        opacity={0.7}
        style={{ pointerEvents: "none" }}
      />
    </svg>
  );
}

function BarChart({
  values,
  labels,
  color,
  peakLabel,
}: {
  values: number[];
  labels: string[];
  color: string;
  peakLabel?: (v: number) => string;
}) {
  const H = 180;
  const chartH = H - PAD_B - PAD_T;
  const max = Math.max(...values);
  const slotW = (SVG_W - PAD_LR * 2) / values.length;
  const gap = 8;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {values.map((v, i) => {
        const barH = Math.round((v / max) * chartH);
        const x = PAD_LR + i * slotW + gap / 2;
        const y = PAD_T + (chartH - barH);
        const w = slotW - gap;
        const isPeak = v === max;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} fill={color} rx={4} fillOpacity={isPeak ? 1 : 0.65} />
            {isPeak && peakLabel && (
              <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
                {peakLabel(v)}
              </text>
            )}
            <text x={x + w / 2} y={H - 7} textAnchor="middle" fontSize={10} fill="rgba(248,247,244,0.5)">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineAreaChart({
  values,
  labels,
  lineColor,
  gradId,
  yMax,
}: {
  values: number[];
  labels: string[];
  lineColor: string;
  gradId: string;
  yMax?: number;
}) {
  const H = 170;
  const chartH = H - PAD_B - PAD_T;
  const chartW = SVG_W - PAD_LR * 2;
  const max = yMax ?? Math.max(...values) * 1.1;
  const step = chartW / (values.length - 1);

  const pts = values.map((v, i) => ({
    x: PAD_LR + i * step,
    y: PAD_T + chartH - Math.round((v / max) * chartH),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_B} L${pts[0].x.toFixed(1)},${H - PAD_B} Z`;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
      ))}
      {labels.map((lbl, i) => (
        <text
          key={i}
          x={PAD_LR + i * step}
          y={H - 7}
          textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
          fontSize={10}
          fill="rgba(248,247,244,0.5)"
        >
          {lbl}
        </text>
      ))}
    </svg>
  );
}

function DualLineChart({
  values1,
  values2,
  labels,
  color1,
  color2,
  gradId,
}: {
  values1: number[];
  values2: number[];
  labels: string[];
  color1: string;
  color2: string;
  gradId: string;
}) {
  const H = 175;
  const chartH = H - PAD_B - PAD_T;
  const chartW = SVG_W - PAD_LR * 2;
  const max = Math.max(...values1, ...values2) * 1.08;
  const step = chartW / (values1.length - 1);

  const map = (v: number, i: number) => ({
    x: PAD_LR + i * step,
    y: PAD_T + chartH - Math.round((v / max) * chartH),
  });

  const pts1 = values1.map(map);
  const pts2 = values2.map(map);

  const line1 = pts1.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const line2 = pts2.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area2 = `${line2} L${pts2[pts2.length - 1].x.toFixed(1)},${H - PAD_B} L${pts2[0].x.toFixed(1)},${H - PAD_B} Z`;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color2} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color2} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area2} fill={`url(#${gradId})`} />
      <path
        d={line1}
        fill="none"
        stroke={color1}
        strokeWidth={1.8}
        strokeDasharray="5 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={line2} fill="none" stroke={color2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {labels.map((lbl, i) => (
        <text
          key={i}
          x={PAD_LR + i * step}
          y={H - 7}
          textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
          fontSize={10}
          fill="rgba(248,247,244,0.5)"
        >
          {lbl}
        </text>
      ))}
    </svg>
  );
}

function GroupedBarChart({
  series,
  labels,
  colors,
}: {
  series: number[][];
  labels: string[];
  colors: string[];
}) {
  const H = 185;
  const chartH = H - PAD_B - PAD_T;
  const max = Math.max(...series.flat()) * 1.08;
  const n = series.length;
  const slotW = (SVG_W - PAD_LR * 2) / labels.length;
  const innerPad = 8;
  const barGap = 3;
  const barW = (slotW - innerPad * 2 - barGap * (n - 1)) / n;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {labels.map((lbl, i) => {
        const slotX = PAD_LR + i * slotW + innerPad;
        return (
          <g key={i}>
            {series.map((s, si) => {
              const v = s[i];
              const bH = Math.round((v / max) * chartH);
              const x = slotX + si * (barW + barGap);
              const y = PAD_T + (chartH - bH);
              return (
                <rect key={si} x={x} y={y} width={barW} height={bH} fill={colors[si]} rx={3} fillOpacity={0.88} />
              );
            })}
            <text
              x={PAD_LR + i * slotW + slotW / 2}
              y={H - 7}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(248,247,244,0.5)"
            >
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Small UI Components ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bp-text-soft)]">{label}</p>
      <p
        className="bp-heading mt-2 text-2xl font-semibold"
        style={{ color: valueColor ?? "var(--bp-text)" }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--bp-text-soft)]">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  legend,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-5">
      <p className="text-sm font-semibold text-[var(--bp-text)]">{title}</p>
      <p className="mt-0.5 text-xs text-[var(--bp-text-soft)]">{subtitle}</p>
      {legend && <div className="mt-3 flex flex-wrap gap-4">{legend}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--bp-text-muted)]">
      {dashed ? (
        <svg width="18" height="10" viewBox="0 0 18 10">
          <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      ) : (
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  // US-13 state
  const [selectedLot, setSelectedLot] = useState<LotKey>("chauncey");
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // US-14 state
  const [scenario, setScenario] = useState<RevenueScenario>("base");

  // US-15 state
  const [event, setEvent] = useState<EventKey>("football");

  // ── US-13 derived ──────────────────────────────────────────────────────
  const lotCfg = LOT_CONFIG[selectedLot];
  const demandMatrix = DEMAND_MATRIX[selectedLot];
  const dayProfile = demandMatrix[selectedDay];

  const peakOccupancy = useMemo(() => Math.max(...dayProfile), [dayProfile]);
  const avgOccupancy = useMemo(
    () => Math.round(dayProfile.reduce((a, b) => a + b, 0) / dayProfile.length),
    [dayProfile],
  );
  const peakHourIdx = useMemo(() => dayProfile.indexOf(peakOccupancy), [dayProfile, peakOccupancy]);
  const staffing = useMemo(() => staffingLabel(peakOccupancy), [peakOccupancy]);

  const lowWindow = useMemo(() => {
    let best = { start: -1, len: 0 };
    let cur = { start: -1, len: 0 };
    dayProfile.forEach((v, i) => {
      if (v < 40) {
        cur = cur.start === -1 ? { start: i, len: 1 } : { ...cur, len: cur.len + 1 };
        if (cur.len > best.len) best = { ...cur };
      } else {
        cur = { start: -1, len: 0 };
      }
    });
    if (best.start === -1) return "None";
    const endIdx = Math.min(best.start + best.len - 1, FCAST_HOURS.length - 1);
    return `${FCAST_HOURS[best.start]}–${FCAST_HOURS[endIdx]}`;
  }, [dayProfile]);

  // ── US-14 derived ──────────────────────────────────────────────────────
  const sCfg = SCENARIO_CONFIG[scenario];
  const dailyRevenue = useMemo(
    () => BASE_DAILY.map((v) => Math.round(v * sCfg.multiplier)),
    [sCfg.multiplier],
  );
  const weeklyRevenue = useMemo(
    () => BASE_WEEKLY.map((v) => Math.round(v * sCfg.multiplier)),
    [sCfg.multiplier],
  );
  const totalWeekly = useMemo(() => dailyRevenue.reduce((a, b) => a + b, 0), [dailyRevenue]);
  const avgDaily = useMemo(() => Math.round(totalWeekly / 7), [totalWeekly]);
  const peakDayIdx = useMemo(() => dailyRevenue.indexOf(Math.max(...dailyRevenue)), [dailyRevenue]);
  const baseTotal = BASE_DAILY.reduce((a, b) => a + b, 0);
  const deltaVsBase = ((totalWeekly - baseTotal) / baseTotal) * 100;

  // ── US-15 derived ──────────────────────────────────────────────────────
  const eCfg = EVENT_CONFIG[event];
  const peakChangePositive = eCfg.peakChange.startsWith("+");

  return (
    <div className="relative min-h-screen bg-[var(--bp-bg)] text-[var(--bp-text)]">
      <div className="bp-mesh pointer-events-none absolute inset-0" />

      <header className="sticky top-0 z-30 border-b border-[var(--bp-border)] bg-[color-mix(in_oklab,var(--bp-bg-elevated)_82%,black_18%)]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="BoilerPark"
              className="h-10 w-10 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-1"
              draggable={false}
            />
            <div>
              <p className="bp-heading text-sm font-semibold">Revenue &amp; Demand Forecasting</p>
              <p className="text-xs text-[var(--bp-text-soft)]">Scenario modeling · BoilerPark</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-2 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl space-y-10 px-4 pb-24 pt-8 sm:px-6">

        {/* ═══════════════════════════════════════════════════════════════
            US-13 · Demand Forecasting by Lot, Day & Time
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bp-accent)]">
              <MapPin className="h-3.5 w-3.5" />
              Demand Forecasting
            </span>
            <h2 className="bp-heading mt-3 text-2xl font-semibold sm:text-3xl">
              Parking Demand by Lot, Day &amp; Time
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--bp-text-muted)]">
              Select a lot and click any day column in the heatmap to see its predicted hourly demand
              profile. Use this to plan staffing, access control, and enforcement schedules.
            </p>
          </div>

          {/* Lot selector */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(LOT_CONFIG) as LotKey[]).map((key) => {
              const cfg = LOT_CONFIG[key];
              const isActive = selectedLot === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedLot(key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-transparent text-[var(--bp-accent-ink)]"
                      : "border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-[var(--bp-accent)]"
                  }`}
                  style={isActive ? { backgroundColor: cfg.color, borderColor: "transparent" } : {}}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Main charts */}
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            {/* Heatmap */}
            <ChartCard
              title={`Weekly Demand Heatmap — ${lotCfg.label}`}
              subtitle="Predicted occupancy % by day & hour · click a column to inspect"
            >
              <HeatmapChart
                matrix={demandMatrix}
                selectedDay={selectedDay}
                onDayClick={setSelectedDay}
                accentColor={lotCfg.color}
              />
              {/* Color scale legend */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-[var(--bp-text-soft)]">Low</span>
                <div
                  className="h-2.5 flex-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${demandColor(0)}, ${demandColor(40)}, ${demandColor(70)}, ${demandColor(100)})`,
                  }}
                />
                <span className="text-xs text-[var(--bp-text-soft)]">High</span>
              </div>
            </ChartCard>

            {/* Hourly profile */}
            <motion.div
              key={`${selectedLot}-${selectedDay}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChartCard
                title={`${FCAST_DAYS[selectedDay]} · Hourly Profile`}
                subtitle={`${lotCfg.label} — 6am to 9pm`}
              >
                <LineAreaChart
                  values={dayProfile}
                  labels={FCAST_HOURS}
                  lineColor={lotCfg.color}
                  gradId="grad-demand-profile"
                  yMax={100}
                />

                {/* Stat pills below the chart */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--bp-text-soft)]">Peak</p>
                    <p className="bp-heading mt-1 text-lg font-semibold" style={{ color: lotCfg.color }}>
                      {peakOccupancy}%
                    </p>
                    <p className="text-xs text-[var(--bp-text-soft)]">at {FCAST_HOURS[peakHourIdx]}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--bp-text-soft)]">Avg occupancy</p>
                    <p className="bp-heading mt-1 text-lg font-semibold">{avgOccupancy}%</p>
                    <p className="text-xs text-[var(--bp-text-soft)]">across 16 hours</p>
                  </div>
                  <div className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--bp-text-soft)]">Staffing rec.</p>
                    <p className="bp-heading mt-1 text-sm font-semibold leading-tight" style={{ color: staffing.color }}>
                      {staffing.text}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--bp-text-soft)]">Low demand window</p>
                    <p className="bp-heading mt-1 text-sm font-semibold leading-tight text-[var(--bp-text)]">
                      {lowWindow}
                    </p>
                  </div>
                </div>
              </ChartCard>
            </motion.div>
          </div>

          {/* Weekly summary strip */}
          <div className="mt-4 rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-5">
            <p className="mb-3 text-sm font-semibold text-[var(--bp-text)]">
              All-Day Avg Occupancy — {lotCfg.label}
            </p>
            <div className="grid grid-cols-7 gap-2">
              {FCAST_DAYS.map((d, di) => {
                const avg = Math.round(demandMatrix[di].reduce((a, b) => a + b, 0) / 16);
                const isSelected = selectedDay === di;
                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => setSelectedDay(di)}
                    className={`rounded-xl border px-2 py-3 text-center transition ${
                      isSelected
                        ? "border-transparent"
                        : "border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] hover:border-[var(--bp-accent)]"
                    }`}
                    style={isSelected ? { backgroundColor: `${lotCfg.color}22`, borderColor: lotCfg.color } : {}}
                  >
                    <p className="text-xs font-semibold text-[var(--bp-text-soft)]">{d}</p>
                    <p
                      className="bp-heading mt-1 text-lg font-semibold"
                      style={{ color: isSelected ? lotCfg.color : undefined }}
                    >
                      {avg}%
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--bp-text-soft)] opacity-60">
            Demand forecasts derived from time-series model trained on 18-month historical data. Lot, day, and
            time filters will query the forecasting API once backend routes are wired.
          </p>
        </section>

        <div className="border-t border-[var(--bp-border)]" />

        {/* ═══════════════════════════════════════════════════════════════
            US-14 · Revenue Projections
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bp-accent)]">
              <DollarSign className="h-3.5 w-3.5" />
              Revenue Projections
            </span>
            <h2 className="bp-heading mt-3 text-2xl font-semibold sm:text-3xl">
              Daily &amp; Weekly Revenue Forecasting
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--bp-text-muted)]">
              Model parking revenue under different demand and pricing scenarios. Toggle a scenario to see how
              occupancy or pricing tier changes shift daily and weekly projections.
            </p>
          </div>

          {/* Scenario toggles */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(SCENARIO_CONFIG) as RevenueScenario[]).map((key) => {
              const cfg = SCENARIO_CONFIG[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScenario(key)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${scenario === key ? cfg.chipActive : cfg.chipInactive}`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Stats row */}
          <motion.div layout className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Weekly" value={fmt(totalWeekly)} valueColor={sCfg.accentColor} />
            <StatCard label="Avg Daily" value={fmt(avgDaily)} />
            <StatCard label="Peak Day" value={DAYS[peakDayIdx]} sub={fmt(Math.max(...dailyRevenue))} />
            <StatCard
              label="vs Base"
              value={scenario === "base" ? "—" : `${deltaVsBase >= 0 ? "+" : ""}${deltaVsBase.toFixed(1)}%`}
              valueColor={deltaVsBase > 0 ? "#34d399" : deltaVsBase < 0 ? "#f87171" : undefined}
            />
          </motion.div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div layout>
              <ChartCard title="Daily Revenue" subtitle="Current week · Mon – Sun">
                <BarChart values={dailyRevenue} labels={DAYS} color={sCfg.accentColor} peakLabel={fmt} />
              </ChartCard>
            </motion.div>

            <motion.div layout>
              <ChartCard title="8-Week Projection" subtitle="Weekly total revenue trend">
                <LineAreaChart
                  values={weeklyRevenue}
                  labels={WEEKS}
                  lineColor={sCfg.accentColor}
                  gradId="grad-weekly"
                />
              </ChartCard>
            </motion.div>
          </div>

          <p className="mt-3 text-xs text-[var(--bp-text-soft)] opacity-60">
            Revenue model: occupancy × avg duration 2.4h × tier pricing (Surface $3/hr · Garage $5/hr · Permit
            $0). Scenario multipliers are applied uniformly; pricing-tier logic will be API-driven.
          </p>
        </section>

        <div className="border-t border-[var(--bp-border)]" />

        {/* ═══════════════════════════════════════════════════════════════
            US-15 · Event Impact Preview
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bp-accent)]">
              <Calendar className="h-3.5 w-3.5" />
              Event Impact Preview
            </span>
            <h2 className="bp-heading mt-3 text-2xl font-semibold sm:text-3xl">
              Demand &amp; Congestion Simulator
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--bp-text-muted)]">
              Select an upcoming event or closure to preview its predicted impact on parking demand and
              congestion across all monitored lots.
            </p>
          </div>

          {/* Event selector */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(EVENT_CONFIG) as EventKey[]).map((key) => {
              const cfg = EVENT_CONFIG[key];
              const isActive = event === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEvent(key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-transparent bg-[var(--bp-accent)] text-[var(--bp-accent-ink)]"
                      : "border-[var(--bp-border)] bg-[var(--bp-surface)] text-[var(--bp-text-muted)] hover:border-[var(--bp-accent)]"
                  }`}
                >
                  {cfg.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Event summary card */}
          <motion.div
            key={event}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-4 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <p className="font-semibold text-[var(--bp-text)]">{eCfg.name}</p>
              <p className="mt-0.5 text-sm text-[var(--bp-text-muted)]">{eCfg.description}</p>
            </div>
            <span className="flex-shrink-0 rounded-full border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--bp-accent)]">
              {eCfg.date}
            </span>
          </motion.div>

          {/* Stats row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Peak Demand Change"
              value={eCfg.peakChange}
              valueColor={peakChangePositive ? "#f87171" : "#34d399"}
            />
            <StatCard label="Lots Affected" value={`${eCfg.lotsAffected} / 6`} />
            <StatCard label="Peak Hour" value={eCfg.peakHour} />
            <StatCard label="Expected Duration" value={eCfg.duration} />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Lot Occupancy — Normal vs Event"
              subtitle="Predicted peak occupancy % per lot"
              legend={
                <>
                  <LegendDot color="rgba(148,163,184,0.7)" label="Normal day" />
                  <LegendDot color="#cfb991" label={eCfg.shortLabel} />
                </>
              }
            >
              <GroupedBarChart
                series={[NORMAL_OCCUPANCY, eCfg.eventOccupancy]}
                labels={LOTS}
                colors={["rgba(148,163,184,0.55)", "#cfb991"]}
              />
            </ChartCard>

            <ChartCard
              title="Demand Timeline"
              subtitle="Avg occupancy % across all lots · hourly (8am–7pm)"
              legend={
                <>
                  <LegendDot color="rgba(148,163,184,0.7)" label="Typical day" dashed />
                  <LegendDot color="#cfb991" label="Event day" />
                </>
              }
            >
              <DualLineChart
                values1={NORMAL_TIMELINE}
                values2={eCfg.timelineEvent}
                labels={TIMELINE_HOURS}
                color1="rgba(148,163,184,0.65)"
                color2="#cfb991"
                gradId={`grad-timeline-${event}`}
              />
            </ChartCard>
          </div>

          <p className="mt-3 text-xs text-[var(--bp-text-soft)] opacity-60">
            Demand forecasts derived from historical event patterns and lot capacity models. All values are
            projections — live API-connected forecasts will replace dummy data once routes are wired.
          </p>
        </section>
      </main>
    </div>
  );
}
