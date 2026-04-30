import { motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowLeft, Clock3, RefreshCw, Search, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import logo from "../assets/boilerpark-logo.png";
import { getLotMetadata } from "../data/lotMetadata";
import { fetchParkingAvailability, type ParkingAvailabilityLot } from "../lib/parkingApi";

type LiveLot = ParkingAvailabilityLot & {
  address: string;
  permits: string[];
  category: "Garage" | "Surface Lot";
  payment: "Paid" | "Permit";
};

type AvailabilityStatus = {
  label: string;
  chipClass: string;
};

type StreamEventMeta = {
  source: string;
  event: string | null;
  key: string | null;
  eventTsUtc: string | null;
};

type StreamEventSummary = {
  lot: string;
  count: number;
  meta: StreamEventMeta;
  receivedAt: Date;
};

type ParsedWebSocketUpdate = {
  lotCode: string;
  count: number;
  meta: StreamEventMeta;
};

type StreamHealthState = "live" | "delayed" | "stale" | "connecting" | "offline";

type StreamHealth = {
  state: StreamHealthState;
  label: string;
  detail: string;
  chipClass: string;
};

const POLL_INTERVAL_MS = 25000;
const STREAM_HEALTHY_MS = 15000;
const STREAM_DELAYED_MS = 45000;
const STREAM_HEALTH_TICK_MS = 3000;

function parseLiveCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return null;
}

function parseUtcDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedTime = Date.parse(value);
  if (!Number.isFinite(parsedTime)) {
    return null;
  }

  return new Date(parsedTime);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function lotFromRedisKey(key: string | null): string | null {
  if (!key || !key.endsWith("_availability")) {
    return null;
  }

  return key.slice(0, -"_availability".length).toUpperCase();
}

function resolveWebSocketUrl(): string {
  if (typeof __BP_API_ORIGIN__ === "string" && __BP_API_ORIGIN__.trim().length > 0) {
    try {
      const parsed = new URL(__BP_API_ORIGIN__);
      const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${parsed.host}/ws/parking`;
    } catch {
      // Fall back to same-origin URL below.
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/parking`;
}

function normalizeWebSocketUpdate(rawPayload: unknown): ParsedWebSocketUpdate | null {
  const root = asObject(rawPayload);
  if (!root) {
    return null;
  }

  const rootType = asNonEmptyString(root["type"]);
  const data = asObject(root["data"]);
  const envelopePayload = asObject(root["payload"]);

  let candidate: Record<string, unknown> | null;
  if (rootType === "parking_update") {
    candidate = data ?? envelopePayload;
  } else if (rootType === "parking_message") {
    candidate = envelopePayload ?? data;
  } else {
    candidate = data ?? envelopePayload ?? root;
  }

  if (!candidate) {
    return null;
  }

  const keyFromCandidate = asNonEmptyString(candidate["key"]);
  const explicitLot = asNonEmptyString(candidate["lot"]);
  const lotCode = (explicitLot?.toUpperCase() ?? lotFromRedisKey(keyFromCandidate) ?? "").trim();
  const count = parseLiveCount(candidate["count"] ?? candidate["value"] ?? candidate["available"] ?? null);

  if (!lotCode || count === null) {
    return null;
  }

  const metaObject = asObject(candidate["meta"]) ?? candidate;
  const meta: StreamEventMeta = {
    source: asNonEmptyString(metaObject["source"]) ?? "redis_pubsub",
    event: asNonEmptyString(metaObject["event"]),
    key: asNonEmptyString(metaObject["key"]) ?? keyFromCandidate,
    eventTsUtc:
      asNonEmptyString(metaObject["event_ts_utc"]) ??
      asNonEmptyString(metaObject["eventTsUtc"]) ??
      asNonEmptyString(metaObject["timestamp"]),
  };

  return {
    lotCode,
    count,
    meta,
  };
}

function formatAge(ageMs: number | null): string {
  if (ageMs === null) {
    return "waiting for first event";
  }

  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s ago`;
}

function resolveStreamHealth(socketStatus: "connecting" | "connected" | "offline", ageMs: number | null): StreamHealth {
  if (socketStatus === "connecting") {
    return {
      state: "connecting",
      label: "Connecting to live stream",
      detail: "Opening websocket channel for Redis Pub/Sub updates.",
      chipClass: "border-blue-300/40 bg-blue-500/15 text-blue-100",
    };
  }

  if (socketStatus === "connected") {
    if (ageMs === null) {
      return {
        state: "connecting",
        label: "Connected · awaiting first event",
        detail: "Websocket is connected. Waiting for the next Redis update.",
        chipClass: "border-blue-300/40 bg-blue-500/15 text-blue-100",
      };
    }

    if (ageMs <= STREAM_HEALTHY_MS) {
      return {
        state: "live",
        label: "Live and accurate",
        detail: `Stream update received ${formatAge(ageMs)}.`,
        chipClass: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
      };
    }

    if (ageMs <= STREAM_DELAYED_MS) {
      return {
        state: "delayed",
        label: "Live stream delayed",
        detail: `No new stream events since ${formatAge(ageMs)}.`,
        chipClass: "border-amber-300/40 bg-amber-500/15 text-amber-100",
      };
    }

    return {
      state: "stale",
      label: "Stale live stream",
      detail: `No live events for ${formatAge(ageMs)}. Polling fallback remains active.`,
      chipClass: "border-orange-300/40 bg-orange-500/15 text-orange-100",
    };
  }

  if (ageMs !== null && ageMs <= STREAM_DELAYED_MS) {
    return {
      state: "delayed",
      label: "Reconnecting · recent data shown",
      detail: `Socket offline. Last stream event was ${formatAge(ageMs)}.`,
      chipClass: "border-amber-300/40 bg-amber-500/15 text-amber-100",
    };
  }

  return {
    state: "offline",
    label: "Live stream offline",
    detail: "Websocket disconnected. Dashboard is using API reconciliation.",
    chipClass: "border-red-300/40 bg-red-500/15 text-red-100",
  };
}

function getAvailabilityStatus(available: number | null): AvailabilityStatus {
  if (available === null) {
    return {
      label: "Unknown",
      chipClass: "bg-slate-500/30 text-slate-100 border border-slate-300/35",
    };
  }

  if (available <= 5) {
    return {
      label: "Full / Near Full",
      chipClass: "bg-red-500/20 text-red-100 border border-red-300/40",
    };
  }

  if (available <= 25) {
    return {
      label: "Limited",
      chipClass: "bg-amber-500/20 text-amber-100 border border-amber-300/40",
    };
  }

  return {
    label: "Available",
    chipClass: "bg-emerald-500/20 text-emerald-100 border border-emerald-300/40",
  };
}

function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) {
    return "Waiting for first update";
  }

  return lastUpdated.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function GarageCard({ lot }: { lot: LiveLot }) {
  const status = getAvailabilityStatus(lot.available);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.34)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bp-text-soft)]">
            {lot.code}
          </p>
          <h3 className="bp-heading mt-2 text-xl font-semibold leading-tight">{lot.name}</h3>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.chipClass}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <p className="bp-heading text-4xl font-semibold text-[var(--bp-accent)]">
          {lot.available === null ? "--" : lot.available}
        </p>
        <p className="pb-1 text-sm text-[var(--bp-text-muted)]">available now</p>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm text-[var(--bp-text-muted)]">{lot.address}</p>
        <p className="text-xs uppercase tracking-[0.1em] text-[var(--bp-text-soft)]">
          {lot.category} - {lot.payment} - Permits: {lot.permits.join(", ")}
        </p>
      </div>
    </motion.article>
  );
}

export default function DashboardPage() {
  const [lots, setLots] = useState<ParkingAvailabilityLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastApiSyncAt, setLastApiSyncAt] = useState<Date | null>(null);
  const [lastApiSource, setLastApiSource] = useState<string>("redis_snapshot");
  const [lastStreamEventAt, setLastStreamEventAt] = useState<Date | null>(null);
  const [lastStreamEvent, setLastStreamEvent] = useState<StreamEventSummary | null>(null);
  const [healthTick, setHealthTick] = useState<number>(() => Date.now());
  const [query, setQuery] = useState("");
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "offline">(
    "connecting"
  );

  const loadAvailability = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const snapshot = await fetchParkingAvailability();
      const generatedAt = parseUtcDate(snapshot.generatedAtUtc) ?? new Date();

      setLots(snapshot.lots);
      setLastApiSyncAt(generatedAt);
      setLastApiSource(snapshot.source);
      setLastUpdated(new Date());
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load lots";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const healthTickInterval = window.setInterval(() => {
      setHealthTick(Date.now());
    }, STREAM_HEALTH_TICK_MS);

    return () => {
      window.clearInterval(healthTickInterval);
    };
  }, []);

  useEffect(() => {
    void loadAvailability(false);

    const intervalId = window.setInterval(() => {
      void loadAvailability(true);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadAvailability]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectDelayMs = 1000;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      const wsUrl = resolveWebSocketUrl();
      setSocketStatus("connecting");
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (disposed) {
          return;
        }

        reconnectDelayMs = 1000;
        setSocketStatus("connected");
      };

      socket.onerror = () => {
        if (disposed) {
          return;
        }

        setSocketStatus("offline");
      };

      socket.onclose = () => {
        if (disposed) {
          return;
        }

        setSocketStatus("offline");

        reconnectTimer = window.setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000);
          connect();
        }, reconnectDelayMs);
      };

      socket.onmessage = (event) => {
        try {
          const parsed = normalizeWebSocketUpdate(JSON.parse(event.data) as unknown);
          if (!parsed) {
            return;
          }

          const { lotCode, count: nextCount, meta: nextMeta } = parsed;

          setLots((previousLots) =>
            previousLots.map((lot) => {
              if (lot.code.toUpperCase() !== lotCode) {
                return lot;
              }

              return {
                ...lot,
                available: nextCount,
              };
            })
          );

          const eventAt = parseUtcDate(nextMeta.eventTsUtc) ?? new Date();
          setLastStreamEventAt(eventAt);
          setLastStreamEvent({
            lot: lotCode,
            count: nextCount,
            meta: nextMeta,
            receivedAt: new Date(),
          });

          setLastUpdated(new Date());
        } catch {
          // Ignore malformed websocket packets.
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, []);

  const streamAgeMs = useMemo(() => {
    if (!lastStreamEventAt) {
      return null;
    }

    return Math.max(0, healthTick - lastStreamEventAt.getTime());
  }, [healthTick, lastStreamEventAt]);

  const streamHealth = useMemo(
    () => resolveStreamHealth(socketStatus, streamAgeMs),
    [socketStatus, streamAgeMs]
  );

  const visibleLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lots
      .map((lot): LiveLot => {
        const metadata = getLotMetadata(lot.code, lot.name);

        return {
          ...lot,
          address: metadata.address,
          permits: metadata.permits,
          category: metadata.category,
          payment: metadata.payment,
        };
      })
      .filter((lot) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = `${lot.name} ${lot.code} ${lot.address}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aAvailable = a.available ?? -1;
        const bAvailable = b.available ?? -1;

        if (bAvailable !== aAvailable) {
          return bAvailable - aAvailable;
        }

        return a.name.localeCompare(b.name);
      });
  }, [lots, query]);

  const summary = useMemo(() => {
    const knownLots = visibleLots.filter((lot) => lot.available !== null);
    const totalAvailable = knownLots.reduce((acc, lot) => acc + (lot.available ?? 0), 0);
    const constrainedLots = knownLots.filter((lot) => (lot.available ?? 0) <= 25).length;

    return {
      lotCount: visibleLots.length,
      totalAvailable,
      constrainedLots,
    };
  }, [visibleLots]);

  const StreamHealthIcon =
    streamHealth.state === "live"
      ? Activity
      : streamHealth.state === "offline"
        ? WifiOff
        : streamHealth.state === "stale"
          ? AlertTriangle
          : streamHealth.state === "delayed"
            ? Clock3
            : Wifi;

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
              <p className="bp-heading text-sm font-semibold">BoilerPark Dashboard</p>
              <p className="text-xs text-[var(--bp-text-soft)]">Current Purdue lot availability</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/forecast"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-2 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)]"
            >
              Forecast
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-3 py-2 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <section className="rounded-3xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bp-accent)]">
                Live Dashboard
              </p>
              <h1 className="bp-heading mt-2 text-3xl font-semibold sm:text-4xl">
                Purdue Parking Availability
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--bp-text-muted)]">
                Browse each garage and lot with current availability counts, address context, and
                permit details. Use search to quickly narrow by lot name or code.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadAvailability(false)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--bp-accent)] px-4 py-2 text-sm font-semibold text-[var(--bp-accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <div className={`min-w-[290px] rounded-xl border px-3 py-2 text-xs ${streamHealth.chipClass}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <StreamHealthIcon className="h-4 w-4" />
                  {streamHealth.label}
                </div>
                <div className="mt-1 text-[11px] opacity-90">{streamHealth.detail}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-3 text-sm text-[var(--bp-text-muted)] sm:grid-cols-3">
              <p>
                <span className="text-[var(--bp-text-soft)]">Tracked lots:</span> {summary.lotCount}
              </p>
              <p>
                <span className="text-[var(--bp-text-soft)]">Total visible spaces:</span> {summary.totalAvailable}
              </p>
              <p>
                <span className="text-[var(--bp-text-soft)]">Low availability lots:</span> {summary.constrainedLots}
              </p>
            </div>
          </div>

          <div className="mt-2 grid gap-2 text-xs text-[var(--bp-text-soft)] sm:grid-cols-2">
            <p>
              <span className="font-semibold uppercase tracking-[0.1em] text-[var(--bp-text-muted)]">
                Last live event:
              </span>{" "}
              {lastStreamEvent
                ? `${lastStreamEvent.lot} -> ${lastStreamEvent.count} (${lastStreamEvent.meta.event ?? "update"}) at ${formatLastUpdated(lastStreamEventAt)}`
                : "Waiting for Redis stream event"}
            </p>
            <p>
              <span className="font-semibold uppercase tracking-[0.1em] text-[var(--bp-text-muted)]">
                API reconcile:
              </span>{" "}
              {`${formatLastUpdated(lastApiSyncAt)} (${lastApiSource})`} · Last UI refresh {formatLastUpdated(lastUpdated)}
            </p>
          </div>

          <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-bg-elevated)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--bp-text-soft)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by lot name, code, or address"
              className="w-full bg-transparent text-sm text-[var(--bp-text)] placeholder:text-[var(--bp-text-soft)] focus:outline-none"
            />
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)]"
              />
            ))}
          </section>
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleLots.map((lot) => (
              <GarageCard key={lot.code} lot={lot} />
            ))}
          </section>
        )}

        {!loading && visibleLots.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-5 py-8 text-center">
            <p className="bp-heading text-xl font-semibold">No lots match your search</p>
            <p className="mt-2 text-sm text-[var(--bp-text-muted)]">
              Clear the search box to return to the full Purdue availability list.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
