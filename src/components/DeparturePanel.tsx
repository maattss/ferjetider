import { useEffect } from "react";
import { DepartureList } from "@/components/DepartureList";
import type { TravelDirectionRoute } from "@/config/routes";
import type { UseDeparturesResult } from "@/hooks/useDepartures";
import {
  approachPercent,
  countdownParts,
  DELAY_THRESHOLD_MINUTES,
  estimateHeadwayMs,
  upcomingDepartures,
} from "@/lib/departures";
import { formatOsloTime } from "@/lib/time";
import { departureId } from "@/lib/trip";
import type { Departure } from "@/types/departures";

const MIN_LIST_ROWS = 4;
/** Rows kept above the gap when the highlighted sailing is far down. */
const LEAD_ROWS = 2;

interface DeparturePanelProps {
  route: TravelDirectionRoute;
  query: UseDeparturesResult;
  now: Date;
  /** First leg: the sailing the driver picked, and how to pick one. */
  chosenId?: string | null;
  onSelect?: (departure: Departure) => void;
  /** Second leg: the sailing the trip plan says you make. */
  catchId?: string | null;
  onUpdated?: (panelKey: string, updatedAt: string | null) => void;
}

function StatusIndicator({
  isFallback,
  hasError,
}: {
  isFallback: boolean;
  hasError: boolean;
}): JSX.Element {
  if (hasError && !isFallback) {
    return (
      <div className="status-pill err">
        <span className="dot err" />
        FEIL
      </div>
    );
  }
  if (isFallback) {
    return (
      <div className="status-pill">
        <span className="dot warn" />
        LAGRET
      </div>
    );
  }
  return (
    <div className="live-dot">
      <span />
      LIVE
    </div>
  );
}

export function DeparturePanel({
  route,
  query,
  now,
  chosenId = null,
  onSelect,
  catchId = null,
  onUpdated,
}: DeparturePanelProps): JSX.Element {
  const { fromLabel, toLabel, sambandName, fromRegion } = route;
  const { data, error, isFallback, isLoading, isFetching, refetch } = query;

  const departures = upcomingDepartures(data?.departures ?? [], now);
  const nextIndex = departures.findIndex((d) => !d.cancelled);
  const nextDeparture = nextIndex >= 0 ? departures[nextIndex] : undefined;
  const cancelledBeforeNext = departures
    .slice(0, nextIndex >= 0 ? nextIndex : departures.length)
    .filter((d) => d.cancelled);
  const laterAll = nextIndex >= 0 ? departures.slice(nextIndex + 1) : [];

  // Keep the highlighted sailing on screen without listing every sailing
  // before it: with 15-minute headways it can be a dozen rows down.
  const markedIndex = laterAll.findIndex((d) => {
    const id = departureId(d);
    return id === catchId || id === chosenId;
  });
  const isFarDown = markedIndex >= MIN_LIST_ROWS;
  const laterDepartures = isFarDown
    ? [
        ...laterAll.slice(0, LEAD_ROWS),
        ...laterAll.slice(markedIndex, markedIndex + 2),
      ]
    : laterAll.slice(0, MIN_LIST_ROWS);
  const gap = isFarDown
    ? { afterIndex: LEAD_ROWS - 1, skipped: markedIndex - LEAD_ROWS }
    : null;

  const diffMs = nextDeparture
    ? new Date(nextDeparture.departureTimeIso).getTime() - now.getTime()
    : 0;
  const { minutes: minsTo, seconds: secsTo } = countdownParts(diffMs);
  const isImminent = Boolean(nextDeparture) && diffMs < 90_000;
  const isSoon = Boolean(nextDeparture) && diffMs < 5 * 60_000;

  const progressPct = nextDeparture
    ? approachPercent(
        diffMs,
        estimateHeadwayMs(departures.filter((d) => !d.cancelled)),
      )
    : 0;

  const showError = error !== null && !nextDeparture;
  const alerts = data?.alerts ?? [];
  const nextId = nextDeparture ? departureId(nextDeparture) : null;
  const nextIsCatch = nextId !== null && nextId === catchId;
  const nextIsChosen = nextId !== null && nextId === chosenId;
  const isDelayed = (nextDeparture?.delayMinutes ?? 0) >= DELAY_THRESHOLD_MINUTES;

  const panelKey = `${route.routeKey}-${route.directionKey}`;
  const updatedAt = data?.updatedAt ?? null;

  useEffect(() => {
    onUpdated?.(panelKey, updatedAt);
  }, [onUpdated, panelKey, updatedAt]);

  return (
    <section className="samband-card">
      <header className="samband-head">
        <div className="samband-crumbs">
          <span className="samband-route">
            {fromLabel}
            <span className="route-arrow" aria-hidden="true">
              →
            </span>
            {toLabel}
          </span>
          <span className="samband-name">{sambandName}</span>
        </div>
        <StatusIndicator isFallback={isFallback} hasError={error !== null} />
      </header>

      {alerts.length > 0 && (
        <ul className="alerts" aria-label="Driftsmeldinger">
          {alerts.map((alert) => (
            <li key={alert}>{alert}</li>
          ))}
        </ul>
      )}

      {nextDeparture ? (
        <div
          className={`next-block ${
            isImminent ? "imminent" : isSoon ? "soon" : ""
          } ${nextIsCatch ? "catch" : ""}`}
        >
          <div className="next-label">
            Neste avgang
            <span
              className={`rt-flag ${nextDeparture.realtime ? "live" : ""}`}
            >
              {nextDeparture.realtime ? "sanntid" : "rutetid"}
            </span>
            {nextIsCatch && <span className="badge ok">Du rekker</span>}
            {nextIsChosen && <span className="badge accent">Valgt</span>}
          </div>
          <div className="next-clock tabular">{nextDeparture.displayTime}</div>
          <div className="next-countdown-row">
            <div className="countdown">
              <span className="cd-num tabular">{minsTo}</span>
              <span className="cd-unit">min</span>
              {minsTo < 10 && (
                <span className="cd-secs tabular">
                  :{String(secsTo).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="countdown-meta">
              {isDelayed ? (
                <div className="delay">
                  {nextDeparture.delayMinutes} min forsinket (rute{" "}
                  {formatOsloTime(nextDeparture.aimedDepartureTimeIso)})
                </div>
              ) : (
                <div>Fra {fromLabel}</div>
              )}
              <div className="muted">
                Kai: {nextDeparture.quay || `${fromRegion} ferjekai`}
              </div>
            </div>
          </div>
          {onSelect && (
            <button
              type="button"
              className={`choose ${nextIsChosen ? "active" : ""}`}
              aria-pressed={nextIsChosen}
              onClick={() => onSelect(nextDeparture)}
            >
              {nextIsChosen ? "✓ Du tar denne" : "Jeg tar denne"}
            </button>
          )}
          {cancelledBeforeNext.length > 0 && (
            <p className="cancelled-note">
              Innstilt: {cancelledBeforeNext.map((d) => d.displayTime).join(", ")}
            </p>
          )}
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : (
        <div className="next-block empty">
          <div className="next-label">
            {isLoading
              ? "Henter avganger…"
              : showError
                ? "Ingen data"
                : cancelledBeforeNext.length > 0
                  ? "Alle kjente avganger er innstilt"
                  : "Ingen planlagte avganger"}
          </div>
          {showError && (
            <>
              <p className="next-error">{error}</p>
              <button
                type="button"
                className="retry"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Prøver…" : "Prøv igjen"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="upcoming">
        <div className="upcoming-head">Videre avganger</div>
        <DepartureList
          departures={laterDepartures}
          isLoading={isLoading && !nextDeparture}
          toLabel={toLabel}
          now={now}
          chosenId={chosenId}
          catchId={catchId}
          onSelect={onSelect}
          gap={gap}
        />
      </div>
    </section>
  );
}
