import { useDepartures } from "@/hooks/useDepartures";
import { DepartureList } from "@/components/DepartureList";
import { StatusBar } from "@/components/StatusBar";
import { Separator } from "@/components/ui/separator";
import { formatMinutesLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { DirectionKey, RouteKey } from "@/config/routes";

interface DeparturePanelProps {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  fromLabel: string;
  toLabel: string;
}

export function DeparturePanel({
  routeKey,
  directionKey,
  fromLabel,
  toLabel,
}: DeparturePanelProps): JSX.Element {
  const { data, error, isFallback, isLoading } = useDepartures({
    routeKey,
    directionKey,
    limit: 6,
  });

  const departures = data?.departures ?? [];
  const nextDeparture = departures[0];
  const laterDepartures = nextDeparture ? departures.slice(1) : departures;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {fromLabel} → {toLabel}
        </h2>
        <Separator className="flex-1" />
      </div>

      <StatusBar
        updatedAt={data?.updatedAt}
        error={error}
        isFallback={isFallback}
      />

      <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(15,95,143,0.16),rgba(44,155,200,0.16))] p-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary/90">
          Neste avgang
        </p>

        {nextDeparture ? (
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-5xl font-semibold tabular-nums leading-none text-foreground">
                {nextDeparture.displayTime}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                Til {nextDeparture.destination}
              </div>
              <div className="text-xs text-muted-foreground">
                Kai: {nextDeparture.quay || "Ukjent"}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-primary/30 bg-white/90 px-3 py-1 text-sm font-semibold text-primary">
                {formatMinutesLabel(nextDeparture.minutesUntil)}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
                  nextDeparture.realtime
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-white text-muted-foreground",
                )}
              >
                {nextDeparture.realtime ? "Live" : "Planlagt"}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading ? "Henter neste avganger..." : "Ingen avganger funnet akkurat nå."}
          </p>
        )}
      </div>

      <DepartureList
        departures={laterDepartures}
        isLoading={isLoading}
        emptyMessage={
          nextDeparture
            ? "Ingen flere avganger akkurat nå."
            : "Ingen avganger funnet akkurat nå."
        }
      />
    </div>
  );
}
