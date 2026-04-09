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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`loading-row-${index}`}
          className="grid grid-cols-[96px_1fr_72px] items-center gap-3 border-b border-border/50 px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-10 w-20" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-16 justify-self-end" />
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
      <div className="rounded-2xl border border-border bg-card p-5 text-base text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-border bg-card">
      {departures.map((departure) => (
        <li
          key={`${departure.departureTimeIso}-${departure.destination}-${departure.quay}`}
          className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/50 px-5 py-4 last:border-b-0"
        >
          <div className="flex items-baseline gap-4 min-w-0">
            <div className="text-[2.4rem] font-bold tabular-nums leading-none text-foreground shrink-0">
              {departure.displayTime}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground">
                Til {departure.destination}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                Kai: {departure.quay || "Ukjent"}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-base font-bold text-foreground tabular-nums">
              {formatMinutesLabel(departure.minutesUntil)}
            </span>
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                departure.realtime ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {departure.realtime ? "Live" : "Planlagt"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
