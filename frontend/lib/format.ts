const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** e.g. "2 days ago" or, for very recent posts, "just now". */
export function formatRelativeTime(isoDate: string): string {
  const seconds = (Date.parse(isoDate) - Date.now()) / 1000;

  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return relativeFormatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return "just now";
}

/** e.g. "JOB-014", a stable, human-friendly label derived from the primary key. */
export function jobReqCode(id: number): string {
  return `JOB-${String(id).padStart(3, "0")}`;
}
