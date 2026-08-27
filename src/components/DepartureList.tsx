import type { Departure } from "@/types/departures";
import { formatRelativeLabel, minutesUntilDeparture } from "@/lib/time";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
  toLabel: string;
  now: Date;
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

export function DepartureList({
  departures,
  isLoading,
  toLabel,
  now,
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
        return (
          <li
            key={`${d.departureTimeIso}-${d.destination}-${d.quay}`}
            className="upcoming-row"
          >
            <span className="u-time tabular">{d.displayTime}</span>
            <span className="u-to">Til {d.destination || toLabel}</span>
            <span className="u-in tabular">
              {!d.realtime && (
                <span className="u-planned" title="Rutetid, ikke sanntidssporet">
                  rutetid
                </span>
              )}
              om {formatRelativeLabel(mins)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
