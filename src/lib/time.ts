const OSLO_LOCALE = "nb-NO";
const OSLO_TIMEZONE = "Europe/Oslo";

export function formatOsloTime(input: string | number | Date): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(OSLO_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OSLO_TIMEZONE,
  }).format(date);
}

export function minutesUntilDeparture(
  departureIso: string,
  now: Date = new Date(),
): number {
  const departureDate = new Date(departureIso);
  if (Number.isNaN(departureDate.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((departureDate.getTime() - now.getTime()) / 60000));
}

export function formatMinutesLabel(minutesUntil: number): string {
  if (minutesUntil <= 0) {
    return "Nå";
  }

  if (minutesUntil >= 60) {
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    return mins === 0 ? `${hours}t` : `${hours}t ${mins}m`;
  }

  return `${minutesUntil} min`;
}
