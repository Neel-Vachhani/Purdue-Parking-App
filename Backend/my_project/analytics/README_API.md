Analytics API

Endpoint

- GET /api/analytics/forecast/?lot=<PURDUE_CODE>&horizon=<minutes>&as_of=<ISO8601 optional>

Response keys

- recent_actuals: list of observations with `timestamp`, `available`, `occupied`, `occupancy_pct`.
- baseline_forecast: nullable list of forecast timesteps from baseline model (may be null if artifacts absent).
- gru_forecast: nullable list of forecast timesteps from GRU model; each item includes `timestamp`, `available`, `occupancy_pct`, `lower`, `upper`.
- derived: object of numeric summaries (see below).
- insights: list of rule-based alerts (code, severity, message).

Derived metrics (Story 11)

- `current_occupancy_pct`: current occupancy fraction (0..1)
- `rate_of_change_per_hour`: slope of occupancy in percent points per hour
- `time_to_capacity_min`: minutes until expected full (null if decreasing)
- `expected_peak`: `{timestamp, occupancy_pct}` predicted peak in the horizon
- `utilization_trend`: one of `increasing`, `decreasing`, `stable`
- `confidence`: float 0..1 indicating model confidence/quality

Insights (Story 12)

- Array of short rule-based messages produced by `insights.generate_insights()`.

Notes for developers

- Artifacts are tracked in `analytics/artifacts/`. If you change models or retrain, replace model files there.
- Do not commit large unrelated binaries; use Git LFS or an artifact store if sizes grow.
- Example response available at `analytics/examples/forecast_response.json`.

Frontend consumer example

- See `Frontend/mobile/app/utils/analytics_api_example.ts` for a minimal `fetch` snippet that reads `derived` and `insights`.
