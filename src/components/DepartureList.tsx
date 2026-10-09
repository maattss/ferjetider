import { DELAY_THRESHOLD_MINUTES } from "@/lib/departures";
import type { Departure } from "@/types/departures";
import { formatRelativeLabel, minutesUntilDeparture } from "@/lib/time";
import { departureId } from "@/lib/trip";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
  toLabel: string;
  now: Date;
  chosenId?: string | null;
  catchId?: string | null;
  onSelect?: (departure: Departure) => void;
}

function LoadingRows(): JSX.Element {
  return (
    <div className="upcoming-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sk-row">
          <span className="sk-bar tall" />
          <span className="sk-bar" />
          <span className="sk-bar" style={{ width: 60 }} />
        </div>
      ))}
    </div>
  );
}

function RowStatus({
  departure,
  toLabel,
  isChosen,
  isCatch,
}: {
  departure: Departure;
  toLabel: string;
  isChosen: boolean;
  isCatch: boolean;
}): JSX.Element {
  if (departure.cancelled) {
    return <span className="badge err">Innstilt</span>;
  }
  const isDelayed = departure.delayMinutes >= DELAY_THRESHOLD_MINUTES;
  if (!isChosen && !isCatch && !isDelayed) {
    return <>Til {departure.destination || toLabel}</>;
  }
  return (
    <>
      {isChosen && <span className="badge accent">Valgt</span>}
      {isCatch && <span className="badge ok">Du rekker</span>}
      {isDelayed && <span className="badge warn">+{departure.delayMinutes} min</span>}
    </>
  );
}

export function DepartureList({
  departures,
  isLoading,
  toLabel,
  now,
  chosenId = null,
  catchId = null,
  onSelect,
}: DepartureListProps): JSX.Element {
  if (isLoading && departures.length === 0) {
    return <LoadingRows />;
  }

  if (departures.length === 0) {
    return <p className="upcoming-empty">Ingen flere avganger i horisonten.</p>;
  }

  return (
    <ol className="upcoming-list">
      {departures.map((d) => {
        const mins = minutesUntilDeparture(d.departureTimeIso, now);
        const id = departureId(d);
        const isChosen = id === chosenId;
        const isCatch = id === catchId;
        const className = [
          "upcoming-row",
          d.cancelled ? "cancelled" : "",
          isChosen || isCatch ? "marked" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const content = (
          <>
            <span className="u-time tabular">{d.displayTime}</span>
            <span className="u-to">
              <RowStatus
                departure={d}
                toLabel={toLabel}
                isChosen={isChosen}
                isCatch={isCatch}
              />
            </span>
            <span className="u-in tabular">
              {!d.realtime && !d.cancelled && (
                <span className="u-planned" title="Rutetid, ikke sanntidssporet">
                  rutetid
                </span>
              )}
              om {formatRelativeLabel(mins)}
            </span>
          </>
        );

        return (
          <li key={`${d.departureTimeIso}-${d.destination}-${d.quay}`}>
            {onSelect && !d.cancelled ? (
              <button
                type="button"
                className={`${className} selectable`}
                aria-pressed={isChosen}
                onClick={() => onSelect(d)}
              >
                {content}
              </button>
            ) : (
              <div className={className}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
