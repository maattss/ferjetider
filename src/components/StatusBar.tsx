import { formatOsloTime } from "@/lib/time";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StatusBarProps {
  updatedAt?: string;
  error: string | null;
  isFallback: boolean;
}

export function StatusBar({
  updatedAt,
  error,
  isFallback,
}: StatusBarProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {updatedAt
            ? `Oppdatert ${formatOsloTime(updatedAt)}`
            : "Venter på første oppdatering"}
        </span>
      </div>

      {isFallback ? (
        <Alert className="border-amber-500/50 bg-amber-950/40 text-amber-300">
          <AlertDescription>
            Live-data utilgjengelig. Viser sist lagrede avganger.
          </AlertDescription>
        </Alert>
      ) : null}

      {error && !isFallback ? (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
