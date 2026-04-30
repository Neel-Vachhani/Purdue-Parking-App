import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getApiBaseUrl } from "../config/env";

const USE_MOCK = true;  //switch to false to use model predictions
const CONFIDENCE_THRESHOLD = 0.6;
const DEFAULT_HORIZON = 120;

export interface ForecastStep {
  timestamp: string;
  available: number;
  occupancy_pct: number;
  lower?: number;
  upper?: number;
}

export interface ForecastInsight {
  code: string;
  severity: string;
  message: string;
}

export interface ForecastDerived {
  current_occupancy_pct: number;
  rate_of_change_per_hour: number;
  time_to_capacity_min: number | null;
  expected_peak: { timestamp: string; occupancy_pct: number } | null;
  utilization_trend: "increasing" | "decreasing" | "stable";
  confidence: number;
}

export interface ForecastResponse {
  recent_actuals: Array<{
    timestamp: string;
    available: number;
    occupied: number;
    occupancy_pct: number;
  }>;
  baseline_forecast: ForecastStep[] | null;
  gru_forecast: ForecastStep[] | null;
  derived: ForecastDerived;
  insights: ForecastInsight[];
}

export interface ResolvedForecast {
  forecast: ForecastStep[];
  derived: ForecastDerived;
  insights: ForecastInsight[];
  source: "gru" | "baseline";
  raw: ForecastResponse;
}

const LOT_CAPACITIES: Record<string, number> = {
  PGH: 720, PGG: 870, PGU: 950, PGNW: 530, PGMD: 410,
  PGW: 620, PGGH: 480, PGM: 560, LOT_A: 200, LOT_AA: 180,
  LOT_BB: 220, DISC_A: 300, DISC_AB: 280, DISC_ABC: 260,
  SMTH_BCHM: 150, PIERCE_ST: 170,
};

const BASE_CURVE = [
  0.08, 0.06, 0.05, 0.05, 0.06, 0.10,
  0.18, 0.42, 0.68, 0.82, 0.88, 0.91,
  0.93, 0.90, 0.85, 0.78, 0.65, 0.52,
  0.38, 0.28, 0.20, 0.15, 0.12, 0.10,
];

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateMockResponse(lotCode: string, horizonMin: number): ForecastResponse {
  const capacity = LOT_CAPACITIES[lotCode.toUpperCase()] ?? 400;
  const now = new Date();
  const rand = seededRandom(seedHash(`${lotCode}-${now.toISOString().split("T")[0]}`));
  const lotVariance = (rand() - 0.5) * 0.15;
  const stepMin = 15;
  const steps = Math.ceil(horizonMin / stepMin);

  // Generate forecast steps
  const makeSteps = (noiseScale: number): ForecastStep[] => {
    const out: ForecastStep[] = [];
    for (let i = 0; i < steps; i++) {
      const futureTime = new Date(now.getTime() + (i + 1) * stepMin * 60 * 1000);
      const hour = futureTime.getHours() + futureTime.getMinutes() / 60;
      const hourIdx = Math.floor(hour) % 24;
      const basePct = BASE_CURVE[hourIdx] ?? 0.5;
      const pct = Math.max(0.02, Math.min(0.98, basePct + lotVariance + (rand() - 0.5) * noiseScale));
      const occupied = Math.round(pct * capacity);
      const available = capacity - occupied;
      out.push({
        timestamp: futureTime.toISOString(),
        available,
        occupancy_pct: parseFloat((pct * 100).toFixed(1)),
        lower: parseFloat((Math.max(0, pct - 0.05) * 100).toFixed(1)),
        upper: parseFloat((Math.min(1, pct + 0.05) * 100).toFixed(1)),
      });
    }
    return out;
  };

  const gruForecast = makeSteps(0.06);
  const baselineForecast = makeSteps(0.03);

  // Recent actuals (last 60 min, every 5 min)
  const actuals: ForecastResponse["recent_actuals"] = [];
  for (let i = 12; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hour = t.getHours() + t.getMinutes() / 60;
    const hourIdx = Math.floor(hour) % 24;
    const pct = Math.max(0.02, Math.min(0.98, (BASE_CURVE[hourIdx] ?? 0.5) + lotVariance + (rand() - 0.5) * 0.04));
    const occupied = Math.round(pct * capacity);
    actuals.push({
      timestamp: t.toISOString(),
      available: capacity - occupied,
      occupied,
      occupancy_pct: parseFloat((pct * 100).toFixed(1)),
    });
  }

  const currentPct = actuals[actuals.length - 1].occupancy_pct;
  const prevPct = actuals.length > 2 ? actuals[actuals.length - 3].occupancy_pct : currentPct;
  const slope = (currentPct - prevPct) * 6; // per hour

  // ~20% get low confidence to exercise fallback
  const confidence = rand() > 0.2 ? 0.7 + rand() * 0.3 : 0.2 + rand() * 0.35;

  // Peak in forecast
  let peakStep = gruForecast[0];
  for (const s of gruForecast) {
    if (s.occupancy_pct > peakStep.occupancy_pct) peakStep = s;
  }

  // Time to capacity
  const ttcStep = gruForecast.findIndex((s) => s.occupancy_pct >= 95);
  const timeToCapacity = ttcStep >= 0 ? (ttcStep + 1) * stepMin : null;

  const derived: ForecastDerived = {
    current_occupancy_pct: currentPct,
    rate_of_change_per_hour: parseFloat(slope.toFixed(1)),
    time_to_capacity_min: timeToCapacity,
    expected_peak: { timestamp: peakStep.timestamp, occupancy_pct: peakStep.occupancy_pct },
    utilization_trend: slope > 2 ? "increasing" : slope < -2 ? "decreasing" : "stable",
    confidence: parseFloat(confidence.toFixed(2)),
  };

  const insights: ForecastInsight[] = [];
  if (currentPct >= 90) insights.push({ code: "near_full", severity: "alert", message: `Nearly full (${currentPct.toFixed(0)}% occupied)` });
  else if (currentPct >= 75) insights.push({ code: "busy", severity: "warn", message: `Getting busy (${currentPct.toFixed(0)}% occupied)` });
  else insights.push({ code: "available", severity: "info", message: `Plenty of space (~${actuals[actuals.length - 1].available} spots)` });
  if (timeToCapacity) insights.push({ code: "time_to_full", severity: "alert", message: `May reach capacity in ~${timeToCapacity} min` });

  return {
    recent_actuals: actuals,
    gru_forecast: gruForecast,
    baseline_forecast: baselineForecast,
    derived,
    insights,
  };
}


export async function fetchForecast(
  lotCode: string,
  horizon: number = DEFAULT_HORIZON
): Promise<ForecastResponse> {
  if (USE_MOCK) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
    return generateMockResponse(lotCode, horizon);
  }

  const API_BASE = getApiBaseUrl();
  const url = `${API_BASE}/analytics/forecast/?lot=${encodeURIComponent(lotCode)}&horizon=${horizon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analytics API ${res.status}`);
  return res.json();
}


function resolve(resp: ForecastResponse): ResolvedForecast | null {
  const conf = resp.derived?.confidence;
  const hasGRU = resp.gru_forecast && resp.gru_forecast.length > 0;
  const hasBaseline = resp.baseline_forecast && resp.baseline_forecast.length > 0;

  if (hasGRU && conf != null && conf >= CONFIDENCE_THRESHOLD) {
    return { forecast: resp.gru_forecast!, derived: resp.derived, insights: resp.insights, source: "gru", raw: resp };
  }
  if (hasBaseline) {
    return { forecast: resp.baseline_forecast!, derived: resp.derived, insights: resp.insights, source: "baseline", raw: resp };
  }
  if (hasGRU) {
    return {
      forecast: resp.gru_forecast!, derived: resp.derived,
      insights: [...resp.insights, { code: "low_confidence", severity: "warning", message: "Low model confidence" }],
      source: "gru", raw: resp,
    };
  }
  return null;
}


export function useForecast(lotCode: string | undefined) {
  const [data, setData] = useState<ResolvedForecast | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lotCode) return;
    let cancelled = false;
    setLoading(true);

    fetchForecast(lotCode)
      .then((resp) => { if (!cancelled) setData(resolve(resp)); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [lotCode]);

  return { data, loading };
}

export function useBulkForecasts(lotCodes: string[]) {
  const [forecasts, setForecasts] = useState<Map<string, ResolvedForecast>>(new Map());
  const [loading, setLoading] = useState(false);

  const codesKey = useMemo(() => lotCodes.slice().sort().join(","), [lotCodes]);
  const lotCodesRef = useRef(lotCodes);
  lotCodesRef.current = lotCodes;

  useEffect(() => {
    const codes = lotCodesRef.current;
    if (!codes.length) { setForecasts(new Map()); return; }

    let cancelled = false;
    setLoading(true);

    Promise.allSettled(codes.map((code) => fetchForecast(code)))
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, ResolvedForecast>();
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const resolved = resolve(r.value);
            if (resolved) map.set(codes[i], resolved);
          }
        });
        setForecasts(map);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [codesKey]);

  const getForecast = useCallback(
    (code: string) => forecasts.get(code) ?? null,
    [forecasts]
  );

  return { forecasts, loading, getForecast };
}