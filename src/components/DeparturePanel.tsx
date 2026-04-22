import { useEffect, useState } from "react";
import { useDepartures } from "@/hooks/useDepartures";
import { DepartureList } from "@/components/DepartureList";
import type { DirectionKey, RouteKey } from "@/config/routes";

interface DeparturePanelProps {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  fromLabel: string;
  toLabel: string;
  sambandName: string;
  fromRegion: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
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
}: DeparturePanelProps): JSX.Element {
  const { data, error, isFallback, isLoading } = useDepartures({
    routeKey,
    directionKey,
    limit: 7,
  });

  const now = useNow();
  const departures = data?.departures ?? [];
  const nextDeparture = departures[0];
  const laterDepartures = nextDeparture ? departures.slice(1, 7) : [];

  const nextTime = nextDeparture ? new Date(nextDeparture.departureTimeIso) : null;
  const diffMs = nextTime ? nextTime.getTime() - now.getTime() : 0;
  const minsTo = Math.max(0, Math.floor(diffMs / 60000));
  const secsTo = Math.max(0, Math.floor((diffMs % 60000) / 1000));
  const isImminent = nextTime !== null && diffMs < 90_000;
  const isSoon = nextTime !== null && diffMs < 5 * 60_000;

  const progressPct = Math.max(
    0,
    Math.min(100, 100 - (minsTo / 20) * 100),
  );

  const clockLabel = nextTime
    ? `${pad(nextTime.getHours())}:${pad(nextTime.getMinutes())}`
    : "--:--";

  return (
    <section className="samband-card">
      <header className="samband-head">
        <div className="samband-crumbs">
          <span className="samband-name">{sambandName}</span>
          <span className="sep">·</span>
          <span className="samband-route">
            {fromLabel} → {toLabel}
          </span>
        </div>
        <StatusIndicator
          isFallback={isFallback}
          hasError={error !== null}
        />
      </header>

      {nextDeparture ? (
        <div
          className={`next-block ${
            isImminent ? "imminent" : isSoon ? "soon" : ""
          }`}
        >
          <div className="next-label">Neste avgang</div>
          <div className="next-clock tabular">{clockLabel}</div>
          <div className="next-countdown-row">
            <div className="countdown">
              <span className="cd-num tabular">{minsTo}</span>
              <span className="cd-unit">min</span>
              {minsTo < 10 && (
                <span className="cd-secs tabular">:{pad(secsTo)}</span>
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
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="next-block empty">
          <div className="next-label">
            {isLoading ? "Henter avganger…" : "Ingen planlagte avganger"}
          </div>
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
