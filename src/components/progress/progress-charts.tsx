"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="km" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="distanceKm" stroke="var(--long-run)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompletionChart({ completed, skipped, planned }: { completed: number; skipped: number; planned: number }) {
  const data = [
    { name: "Completed", value: completed, color: "var(--completed)" },
    { name: "Skipped", value: skipped, color: "var(--skipped)" },
    { name: "Upcoming", value: planned, color: "var(--rest)" },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Completion</CardTitle>
        <CardDescription>Completed vs skipped, plan to date.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 text-sm">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted">{d.name}</span>
              <span className="font-semibold text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
