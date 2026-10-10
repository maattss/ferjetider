import { DELAY_THRESHOLD_MINUTES } from "@/lib/departures";
import type { Departure } from "@/types/departures";
import { formatRelativeLabel, minutesUntilDeparture } from "@/lib/time";
import { departureId } from "@/lib/trip";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
  now: Date;
  chosenId?: string | null;
  onSelect?: (departure: Departure) => void;
  /** Sailings left out between two rows, shown as a single "⋯" row. */
  gap?: { afterIndex: number; skipped: number } | null;
}

function LoadingRows(): JSX.Element {
  return (
    <div className="rows" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="row skeleton">
          <span className="sk-bar" />
        </div>
      ))}
    </div>
  );
}

/** Tags only for what is out of the ordinary; a plain row needs none. */
function RowTags({
  departure,
  isChosen,
}: {
  departure: Departure;
  isChosen: boolean;
}): JSX.Element {
  if (departure.cancelled) {
    return <span className="tag err">Innstilt</span>;
  }
  const isDelayed = departure.delayMinutes >= DELAY_THRESHOLD_MINUTES;
  return (
    <>
      {isChosen && <span className="tag accent">Valgt</span>}
      {isDelayed && <span className="tag warn">+{departure.delayMinutes} min</span>}
      {!departure.realtime && (
        <span className="tag plain" title="Rutetid, ikke sanntidssporet">
          rutetid
        </span>
      )}
    </>
  );
}

export function DepartureList({
  departures,
  isLoading,
  now,
  chosenId = null,
  onSelect,
  gap = null,
}: DepartureListProps): JSX.Element {
  if (isLoading && departures.length === 0) {
    return <LoadingRows />;
  }

  if (departures.length === 0) {
    return <p className="rows-empty">Ingen flere avganger i horisonten.</p>;
  }

  return (
    <ol className="rows">
      {departures.map((d, index) => {
        const id = departureId(d);
        const isChosen = id === chosenId;
        const className = [
          "row",
          d.cancelled ? "cancelled" : "",
          isChosen ? "chosen" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const content = (
          <>
            <span className="row-time tabular">{d.displayTime}</span>
            <span className="row-tags">
              <RowTags departure={d} isChosen={isChosen} />
            </span>
            <span className="row-in tabular">
              {d.cancelled ? "" : formatRelativeLabel(minutesUntilDeparture(d.departureTimeIso, now))}
            </span>
          </>
        );

        const gapRow =
          gap && index === gap.afterIndex + 1 ? (
            <li key="gap" className="row-gap" aria-label={`${gap.skipped} avganger utelatt`}>
              ⋯ {gap.skipped} {gap.skipped === 1 ? "avgang" : "avganger"}
            </li>
          ) : null;

        return [
          gapRow,
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
          </li>,
        ];
      })}
    </ol>
  );
}
