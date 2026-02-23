import { formatMinutesLabel } from "@/lib/time";
import type { Departure } from "@/types/departures";
import { Skeleton } from "@/components/ui/skeleton";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
  emptyMessage?: string;
}

function LoadingRows(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`loading-row-${index}`}
          className="grid grid-cols-[84px_1fr_56px] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-9 w-16" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-12 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function DepartureList({
  departures,
  isLoading,
  emptyMessage = "Ingen avganger funnet akkurat nå.",
}: DepartureListProps): JSX.Element {
  if (isLoading && departures.length === 0) {
    return <LoadingRows />;
  }

  if (departures.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-border bg-white">
      {departures.map((departure) => (
        <li
          key={`${departure.departureTimeIso}-${departure.destination}-${departure.quay}`}
          className="grid grid-cols-[84px_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          <div className="text-[1.9rem] font-semibold tabular-nums leading-none text-foreground">
            {departure.displayTime}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              Til {departure.destination}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              Kai: {departure.quay || "Ukjent"}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-border bg-secondary px-2 py-1 text-xs font-semibold text-foreground">
              {formatMinutesLabel(departure.minutesUntil)}
            </span>
            <span
              className={`text-[0.66rem] font-semibold uppercase tracking-[0.08em] ${departure.realtime ? "text-primary" : "text-muted-foreground"}`}
            >
              {departure.realtime ? "Live" : "Planlagt"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
