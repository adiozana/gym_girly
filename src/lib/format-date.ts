import { format, parseISO } from "date-fns";

// One date style across the app (design skill): DD/MM/YYYY and 24-hour time, in the device's
// time zone. Accepts a timestamp, a "yyyy-MM-dd" calendar date or a Date.
const toDate = (value: string | Date) => (typeof value === "string" ? parseISO(value) : value);

const weekdayFormat = new Intl.DateTimeFormat("he-IL", { weekday: "short" });

export function formatDate(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy");
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy · HH:mm");
}

// "יום ב׳ · 02/11/2026"
export function formatDayAndDate(value: string | Date): string {
  const date = toDate(value);
  return `${weekdayFormat.format(date)} · ${format(date, "dd/MM/yyyy")}`;
}
