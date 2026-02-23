import { formatMinutesLabel } from "@/lib/time";
import type { Departure } from "@/types/departures";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DepartureListProps {
  departures: Departure[];
  isLoading: boolean;
}

function LoadingRows(): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`loading-row-${index}`}
          className="rounded-md border border-border/70 bg-card p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-1 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function DepartureList({ departures, isLoading }: DepartureListProps): JSX.Element {
  if (isLoading && departures.length === 0) {
    return <LoadingRows />;
  }

  if (departures.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        Ingen avganger funnet akkurat nå.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {departures.map((departure) => (
        <li
          key={`${departure.departureTimeIso}-${departure.destination}-${departure.quay}`}
          className="rounded-md border border-border bg-card p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-3xl font-semibold tabular-nums text-foreground">
              {departure.displayTime}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-medium">
                {formatMinutesLabel(departure.minutesUntil)}
              </Badge>
              <Badge variant={departure.realtime ? "default" : "outline"}>
                {departure.realtime ? "Live" : "Planlagt"}
              </Badge>
            </div>
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">Til {departure.destination}</div>
          <div className="text-xs text-muted-foreground">Kai: {departure.quay || "Ukjent"}</div>
        </li>
      ))}
    </ul>
  );
}
