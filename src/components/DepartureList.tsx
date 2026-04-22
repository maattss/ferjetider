import type { Departure } from "@/types/departures";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
  toLabel: string;
  now: Date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRelative(departureIso: string, now: Date): string {
  const diffMs = new Date(departureIso).getTime() - now.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const mm = mins % 60;
    return `${hours}t ${pad(mm)}m`;
  }
  return `${mins} min`;
}

function formatHm(departureIso: string): string {
  const d = new Date(departureIso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    return (
      <p className="upcoming-empty">Ingen flere avganger i horisonten.</p>
    );
  }

  return (
    <ol className="upcoming-list">
      {departures.map((d) => (
        <li
          key={`${d.departureTimeIso}-${d.destination}-${d.quay}`}
          className="upcoming-row"
        >
          <span className="u-time tabular">{formatHm(d.departureTimeIso)}</span>
          <span className="u-to">Til {d.destination || toLabel}</span>
          <span className="u-in tabular">
            om {formatRelative(d.departureTimeIso, now)}
          </span>
        </li>
      ))}
    </ol>
  );
}
