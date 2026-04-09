import { cn } from "@/lib/utils";
import { formatOsloTime } from "@/lib/time";

interface StatusBarProps {
  updatedAt?: string;
  error: string | null;
  isFallback: boolean;
  isFetching: boolean;
}

export function StatusBar({
  updatedAt,
  error,
  isFallback,
  isFetching,
}: StatusBarProps): JSX.Element {
  const tone = error
    ? "error"
    : isFallback
      ? "fallback"
      : isFetching
        ? "syncing"
        : "live";

  if (isFallback) {
    return (
      <span
        className={cn("status-pill text-xs font-medium", "text-amber-300")}
        data-tone={tone}
      >
        <span className="status-dot" aria-hidden="true" />
        Viser lagrede avganger
      </span>
    );
  }

  if (error) {
    return (
      <span
        className={cn("status-pill text-xs font-medium", "text-destructive")}
        data-tone={tone}
      >
        <span className="status-dot" aria-hidden="true" />
        Feil ved henting av data
      </span>
    );
  }

  return (
    <span
      className={cn(
        "status-pill text-xs",
        isFetching ? "text-primary" : "text-muted-foreground",
      )}
      data-tone={tone}
    >
      <span className="status-dot" aria-hidden="true" />
      {isFetching && updatedAt
        ? "Oppdaterer..."
        : updatedAt
          ? `Oppdatert ${formatOsloTime(updatedAt)}`
          : "Henter..."}
    </span>
  );
}
