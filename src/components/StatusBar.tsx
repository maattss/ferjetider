import { formatOsloTime } from "@/lib/time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      <div className="flex items-center justify-between rounded-md border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
        <span>
          {updatedAt
            ? `Oppdatert ${formatOsloTime(updatedAt)}`
            : "Venter på første oppdatering"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void onRefresh();
          }}
          disabled={isFetching}
          className="h-7 px-2 text-xs"
        >
          {isFetching ? "Oppdaterer..." : "Oppdater"}
        </Button>
      </div>

      {isFallback ? (
        <Alert>
          <AlertTitle>Live-data utilgjengelig</AlertTitle>
          <AlertDescription>Viser sist lagrede avganger.</AlertDescription>
        </Alert>
      ) : null}

      {error && !isFallback ? (
        <Alert variant="destructive">
          <AlertTitle>Feil ved henting</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
