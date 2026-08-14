const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "未通信";

  const diffSeconds = (new Date(isoString).getTime() - Date.now()) / 1000;
  const { unit, seconds } = UNITS.find((u) => Math.abs(diffSeconds) >= u.seconds) ?? UNITS[UNITS.length - 1];

  return RELATIVE_TIME_FORMATTER.format(Math.round(diffSeconds / seconds), unit);
}
