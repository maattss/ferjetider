import { formatOsloTime } from "@/lib/time";

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
  if (isFallback) {
    return (
      <span className="text-xs font-medium text-amber-400">
        Viser lagrede avganger
      </span>
    );
  }

  if (error) {
    return (
      <span className="text-xs font-medium text-destructive">
        Feil ved henting av data
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {updatedAt ? `Oppdatert ${formatOsloTime(updatedAt)}` : "Venter..."}
    </span>
  );
}
