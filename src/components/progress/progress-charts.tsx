"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { secondsToPaceText } from "@/lib/training/pace";

export interface WeeklyMileagePoint {
  label: string;
  planned: number;
  completed: number;
}

export interface PacePoint {
  date: string;
  label: string;
  paceSeconds: number;
  type: string;
}

export interface LongRunPoint {
  label: string;
  distanceKm: number;
}

const AXIS_STYLE = { fontSize: 11, fill: "var(--muted)" };
const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function WeeklyMileageChart({ data }: { data: WeeklyMileagePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Mileage</CardTitle>
        <CardDescription>Planned vs actual, by training week.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="km" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="planned" name="Planned" fill="var(--rest)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="var(--a-race)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PaceChart({ data }: { data: PacePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pace Over Time</CardTitle>
        <CardDescription>Actual average pace for logged workouts.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis
              reversed
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => secondsToPaceText(v)}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [`${secondsToPaceText(Number(v))}/km`, "Pace"]}
            />
            <Line type="monotone" dataKey="paceSeconds" stroke="var(--secondary-race)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LongRunChart({ data }: { data: LongRunPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Long Run Progression</CardTitle>
        <CardDescription>Longest run distance, by week.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 12, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="km" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} km`, "Longest run"]} />
            <Line
              type="linear"
              dataKey="distanceKm"
              name="Longest run"
              stroke="var(--long-run)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--long-run)" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompletionChart({ completed, skipped, planned }: { completed: number; skipped: number; planned: number }) {
  const segments = [
    { name: "Completed", value: completed, color: "var(--completed)" },
    { name: "Skipped", value: skipped, color: "var(--skipped)" },
    { name: "Upcoming", value: planned, color: "var(--rest)" },
  ].filter((d) => d.value > 0);

  const total = completed + skipped + planned;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Completion</CardTitle>
        <CardDescription>Completed vs skipped, plan to date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums text-foreground">{completed}</span>
          <span className="text-sm text-muted">of {total} workouts completed · {pct}%</span>
        </div>

        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2">
          {segments.map((s) => (
            <div
              key={s.name}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-muted">{s.name}</span>
              <span className="font-semibold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export interface WeightPoint {
  date: string;
  label: string;
  weightKg: number;
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Body Weight</CardTitle>
        <CardDescription>Logged weight over time.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="kg" domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Weight"]} />
            <Line type="monotone" dataKey="weightKg" stroke="var(--tempo)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export interface RestingHrPoint {
  date: string;
  label: string;
  restingHr: number;
}

export function RestingHrChart({ data }: { data: RestingHrPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resting Heart Rate</CardTitle>
        <CardDescription>Logged resting HR over time.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="bpm" domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} bpm`, "Resting HR"]} />
            <Line type="monotone" dataKey="restingHr" stroke="var(--interval)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
