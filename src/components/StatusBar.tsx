import { formatOsloTime } from "@/lib/time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface StatusBarProps {
  updatedAt?: string;
  error: string | null;
  isFallback: boolean;
  isFetching: boolean;
  onRefresh: () => Promise<void>;
}

export function StatusBar({
  updatedAt,
  error,
  isFallback,
  isFetching,
  onRefresh,
}: StatusBarProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {updatedAt
            ? `Oppdatert ${formatOsloTime(updatedAt)}`
            : "Venter på første oppdatering"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void onRefresh();
          }}
          disabled={isFetching}
          className="h-7 rounded-full border-primary/30 bg-white px-3 text-xs text-primary hover:bg-white"
        >
          {isFetching ? "Oppdaterer..." : "Oppdater"}
        </Button>
      </div>

      {isFallback ? (
        <Alert className="border-amber-300/70 bg-amber-50 text-amber-900">
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
