"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressPoint } from "@/lib/calc";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";

const { progress: copy } = strings.dashboard;

const shortDate = (date: string) => formatDate(date).slice(0, 5); // DD/MM
const percent = (value: number) => `${value > 0 ? "+" : ""}${value}`;

// Percent improvement per workout (SPEC.md): dates left to right even in RTL, a 0% line.
// Loaded lazily from the progress section (Recharts is heavy).
export default function ProgressChart({ points, label }: { points: ProgressPoint[]; label: string }) {
  return (
    <div dir="ltr" role="img" aria-label={label} className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickCount={4}
          />
          <ReferenceLine y={0} stroke="var(--color-ink-subtle)" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: "var(--color-hairline)" }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as ProgressPoint | undefined) : undefined;
              if (!point) return null;
              return (
                <div dir="rtl" className="rounded-md border border-hairline bg-surface px-3 py-2 text-caption shadow-soft">
                  <bdi>{copy.tooltip(formatDate(point.date), percent(point.value))}</bdi>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-rose-deep)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-rose-deep)", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
