import { useDepartures } from "@/hooks/useDepartures";
import { DepartureList } from "@/components/DepartureList";
import { StatusBar } from "@/components/StatusBar";
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
    <div className="flex flex-col gap-2 min-h-0 h-full">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-base font-bold text-foreground">
          {fromLabel} → {toLabel}
        </h2>
        <StatusBar
          updatedAt={data?.updatedAt}
          error={error}
          isFallback={isFallback}
        />
      </div>

      {/* Next departure — dominant */}
      <div className="next-departure-card rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(202_55%_11%),hsl(215_45%_8%))] p-5 flex flex-col justify-between shrink-0 overflow-hidden relative">
        {/* Subtle water shimmer overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(200_85%_58%_/_0.06),transparent)]" aria-hidden="true" />
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-primary/60">
          Neste avgang
        </p>

        {nextDeparture ? (
          <>
            <div className="mt-2">
              <div
                className="font-bold tabular-nums leading-none text-foreground"
                style={{ fontSize: "clamp(3.5rem, 6.5vw, 6rem)" }}
              >
                {nextDeparture.displayTime}
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground/90">
                Til {nextDeparture.destination}
              </div>
              <div className="text-sm text-muted-foreground">
                Kai: {nextDeparture.quay || "Ukjent"}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span
                className="font-bold tabular-nums text-primary"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}
              >
                {formatMinutesLabel(nextDeparture.minutesUntil)}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  nextDeparture.realtime
                    ? "border border-primary/30 bg-primary/15 text-primary"
                    : "border border-border text-muted-foreground",
                )}
              >
                {nextDeparture.realtime ? "Live" : "Planlagt"}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-base text-muted-foreground">
            {isLoading ? "Henter avganger..." : "Ingen avganger funnet akkurat nå."}
          </p>
        )}
      </div>

      {/* Later departures */}
      <div className="flex-1 min-h-0 overflow-y-auto">
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
    </div>
  );
}
