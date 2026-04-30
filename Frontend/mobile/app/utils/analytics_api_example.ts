export async function fetchDerivedAndInsights(lot: string) {
  const url = `/api/analytics/forecast/?lot=${encodeURIComponent(lot)}&horizon=60`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analytics API error ${res.status}`);
  const payload = await res.json();
  return {
    derived: payload.derived,
    insights: payload.insights
  };
}
