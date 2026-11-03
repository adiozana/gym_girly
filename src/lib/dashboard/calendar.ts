import { addDays, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";
import type { ISODate } from "@/lib/calc";

export type MonthKey = { year: number; month: number }; // month: 0..11

export function monthOf(date: ISODate): MonthKey {
  const d = parseISO(date);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth({ year, month }: MonthKey, delta: number): MonthKey {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// The month as weeks starting on Sunday (SPEC.md); days outside the month are null.
export function monthGrid({ year, month }: MonthKey): (ISODate | null)[][] {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(first);
  const cells: (ISODate | null)[] = Array.from({ length: getDay(first) }, () => null);
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(format(d, "yyyy-MM-dd"));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function inMonth(date: ISODate, { year, month }: MonthKey): boolean {
  const d = parseISO(date);
  return d.getFullYear() === year && d.getMonth() === month;
}

const monthTitleFormat = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });

export function monthTitle({ year, month }: MonthKey): string {
  return monthTitleFormat.format(new Date(year, month, 1));
}
