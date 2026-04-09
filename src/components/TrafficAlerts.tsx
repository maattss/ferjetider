import type { CSSProperties } from "react";
import type { TrafficAlert, AlertType } from "@/types/traffic";
import { formatOsloTime } from "@/lib/time";

interface TrafficAlertsProps {
  alerts: TrafficAlert[];
  isLoading: boolean;
}

const TYPE_CONFIG: Record<AlertType, { label: string; classes: string; dot: string }> = {
  closure: {
    label: "Stengt",
    classes: "border-red-500/40 bg-red-950/50 text-red-200",
    dot: "bg-red-400",
  },
  accident: {
    label: "Ulykke",
    classes: "border-orange-500/40 bg-orange-950/50 text-orange-200",
    dot: "bg-orange-400",
  },
  roadworks: {
    label: "Vegarbeid",
    classes: "border-amber-500/30 bg-amber-950/40 text-amber-200",
    dot: "bg-amber-400",
  },
  other: {
    label: "Varsel",
    classes: "border-blue-500/30 bg-blue-950/40 text-blue-200",
    dot: "bg-blue-400",
  },
};

function AlertRow({
  alert,
  index,
}: {
  alert: TrafficAlert;
  index: number;
}) {
  const cfg = TYPE_CONFIG[alert.type];

  return (
    <div
      className={`traffic-alert-row flex items-start gap-3 rounded-xl border px-4 py-3 transition-transform duration-300 hover:-translate-y-0.5 ${cfg.classes}`}
      style={{ "--alert-index": index } as CSSProperties}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            {cfg.label}
          </span>
          {alert.validFrom ? (
            <span className="text-xs opacity-60">
              fra {formatOsloTime(alert.validFrom)}
              {alert.validTo ? ` til ${formatOsloTime(alert.validTo)}` : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm leading-snug">{alert.description}</p>
      </div>
    </div>
  );
}

export function TrafficAlerts({ alerts, isLoading }: TrafficAlertsProps) {
  // Sort: closures first, then accidents, roadworks, other
  const ORDER: AlertType[] = ["closure", "accident", "roadworks", "other"];
  const sorted = [...alerts].sort(
    (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type),
  );

  if (isLoading || sorted.length === 0) return null;

  return (
    <section aria-label="Trafikkvarsler E39" className="traffic-alerts space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Trafikkvarsler E39
        </p>
        <p className="text-[0.6rem] text-muted-foreground/60">
          Data: Statens vegvesen
        </p>
      </div>
      {sorted.map((alert, index) => (
        <AlertRow key={alert.id} alert={alert} index={index} />
      ))}
    </section>
  );
}
