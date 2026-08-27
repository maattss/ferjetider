import { useDepartures } from "@/hooks/useDepartures";
import { DepartureList } from "@/components/DepartureList";
import {
  approachPercent,
  countdownParts,
  estimateHeadwayMs,
  upcomingDepartures,
} from "@/lib/departures";
import type { DirectionKey, RouteKey } from "@/config/routes";

interface DeparturePanelProps {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  fromLabel: string;
  toLabel: string;
  sambandName: string;
  fromRegion: string;
  now: Date;
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
  routeKey,
  directionKey,
  fromLabel,
  toLabel,
  sambandName,
  fromRegion,
  now,
}: DeparturePanelProps): JSX.Element {
  const { data, error, isFallback, isLoading, isFetching, refetch } = useDepartures({
    routeKey,
    directionKey,
    limit: 7,
  });

  const departures = upcomingDepartures(data?.departures ?? [], now);
  const nextDeparture = departures[0];
  const laterDepartures = departures.slice(1, 7);

  const diffMs = nextDeparture
    ? new Date(nextDeparture.departureTimeIso).getTime() - now.getTime()
    : 0;
  const { minutes: minsTo, seconds: secsTo } = countdownParts(diffMs);
  const isImminent = Boolean(nextDeparture) && diffMs < 90_000;
  const isSoon = Boolean(nextDeparture) && diffMs < 5 * 60_000;

  const progressPct = nextDeparture
    ? approachPercent(diffMs, estimateHeadwayMs(departures))
    : 0;

  const showError = error !== null && !nextDeparture;

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

      {nextDeparture ? (
        <div
          className={`next-block ${
            isImminent ? "imminent" : isSoon ? "soon" : ""
          }`}
        >
          <div className="next-label">Neste avgang</div>
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
              <div>Fra {fromLabel}</div>
              <div className="muted">
                Kai: {nextDeparture.quay || `${fromRegion} ferjekai`}
              </div>
            </div>
          </div>
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
        />
      </div>
    </section>
  );
}
