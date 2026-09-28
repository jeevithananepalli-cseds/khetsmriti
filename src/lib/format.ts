// Display formatting shared by server and client code. Pure functions only.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04-12" or an ISO timestamp → "12 Apr 2026". Returns the input unchanged if it isn't a date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : value;
}

/** 1240 → "₹1,240" (Indian digit grouping). */
export function formatRupees(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

/** Finds all YYYY-MM-DD dates in a piece of text, in order, without duplicates. */
export function datesInText(text: string): string[] {
  return [...new Set(text.match(/\d{4}-\d{2}-\d{2}/g) ?? [])];
}

/** Rewrites YYYY-MM-DD dates inside text as "12 Apr 2026". */
export function humaniseDates(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}/g, (d) => formatDate(d));
}

export function timeAgo(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
