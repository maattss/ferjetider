import { CardHead, LoadError } from "@/components/CardParts";
import { CrossingTrack } from "@/components/Ferry";
import { DepartureList } from "@/components/DepartureList";
import type { TravelDirectionRoute } from "@/config/routes";
import type { UseDeparturesResult } from "@/hooks/useDepartures";
import { countdownParts, DELAY_THRESHOLD_MINUTES } from "@/lib/departures";
import { formatOsloTime } from "@/lib/time";
import { departureId } from "@/lib/trip";
import type { Departure } from "@/types/departures";

const LIST_ROWS = 4;
/** Rows kept above the gap when the chosen sailing is far down. */
const LEAD_ROWS = 2;

interface DeparturePanelProps {
  route: TravelDirectionRoute;
  query: UseDeparturesResult;
  departures: Departure[];
  now: Date;
  /** The ferry the plan is built on: the one picked, else the next one. */
  target: Departure | undefined;
  chosenId: string | null;
  onSelect: (departure: Departure) => void;
  onReset?: () => void;
}

function crossingProgress(departure: Departure, now: Date): number {
  const start = new Date(departure.departureTimeIso).getTime();
  const end = new Date(departure.arrivalTimeIso).getTime();
  return end > start ? (now.getTime() - start) / (end - start) : 1;
}

function Countdown({ target, now }: { target: Departure; now: Date }): JSX.Element {
  const diffMs = new Date(target.departureTimeIso).getTime() - now.getTime();
  const { minutes, seconds } = countdownParts(diffMs);
  const hours = Math.floor(minutes / 60);
  const isDelayed = target.delayMinutes >= DELAY_THRESHOLD_MINUTES;

  return (
    <div className={`hero ${diffMs < 90_000 ? "imminent" : ""}`}>
      <div className="hero-figure">
        <span className="hero-num tabular">
          {hours > 0 ? (
            <>
              {hours}
              <span className="hero-unit">t</span> {String(minutes % 60).padStart(2, "0")}
            </>
          ) : (
            minutes
          )}
        </span>
        <span className="hero-unit">min</span>
        {hours === 0 && minutes < 10 && (
          <span className="hero-secs tabular">:{String(seconds).padStart(2, "0")}</span>
        )}
      </div>
      <div className="hero-sub">
        går <span className="tabular strong">{target.displayTime}</span>
        {isDelayed && (
          <span className="warn-text">
            {" "}
            · {target.delayMinutes} min forsinket (rute {formatOsloTime(target.aimedDepartureTimeIso)})
          </span>
        )}
        {!target.realtime && <span className="tag plain">rutetid</span>}
      </div>
    </div>
  );
}

export function DeparturePanel({
  route,
  query,
  departures,
  now,
  target,
  chosenId,
  onSelect,
  onReset,
}: DeparturePanelProps): JSX.Element {
  const { data, error, isLoading } = query;
  const targetSailed =
    target !== undefined && new Date(target.departureTimeIso).getTime() < now.getTime();

  // Keep the chosen sailing on screen without listing every sailing before
  // it: with 15-minute headways it can be a dozen rows down.
  const markedIndex = chosenId
    ? departures.findIndex((d) => departureId(d) === chosenId)
    : -1;
  const isFarDown = markedIndex >= LIST_ROWS;
  const rows = isFarDown
    ? [...departures.slice(0, LEAD_ROWS), ...departures.slice(markedIndex, markedIndex + 2)]
    : departures.slice(0, LIST_ROWS);
  const gap = isFarDown ? { afterIndex: LEAD_ROWS - 1, skipped: markedIndex - LEAD_ROWS } : null;

  return (
    <section className="card">
      <CardHead
        route={route}
        query={query}
        action={
          onReset && (
            <button type="button" className="pill-button" onClick={onReset}>
              Nullstill
            </button>
          )
        }
      />

      {target && !targetSailed ? (
        <Countdown target={target} now={now} />
      ) : target ? (
        <div className="hero">
          <div className="hero-figure">
            <span className="hero-word">Underveis</span>
          </div>
          <div className="hero-sub">
            gikk {target.displayTime} · fremme ca.{" "}
            <span className="tabular strong">{formatOsloTime(target.arrivalTimeIso)}</span>
          </div>
          <CrossingTrack
            fromLabel={route.fromLabel}
            toLabel={route.toLabel}
            progress={crossingProgress(target, now)}
          />
        </div>
      ) : error !== null && !isLoading ? (
        <LoadError query={query} />
      ) : (
        <div className="hero">
          <div className="hero-sub">
            {isLoading
              ? "Henter avganger…"
              : departures.length > 0
                ? "Alle kjente avganger er innstilt"
                : "Ingen planlagte avganger"}
          </div>
        </div>
      )}

      <DepartureList
        departures={rows}
        isLoading={isLoading && !target}
        now={now}
        chosenId={chosenId}
        onSelect={onSelect}
        gap={gap}
      />
    </section>
  );
}
