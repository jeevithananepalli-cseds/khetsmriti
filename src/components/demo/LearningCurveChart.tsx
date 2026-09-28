"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LearningPoint } from "@/lib/learningCurve";
import { Card, SectionTitle } from "../ui";

const LEAF = "#37622f";
const TURMERIC = "#b97c0c";
const GRID = "#e4d9c6";
const MUTED = "#6a5c4d";

interface TooltipPayload {
  payload: LearningPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow">
      <p className="font-semibold">{point.label} 2026</p>
      <p style={{ color: LEAF }}>
        Accepted: {point.acceptedPct ?? "–"}% of {point.advised} advised
      </p>
      <p style={{ color: TURMERIC }}>
        Controlled: {point.controlledPct ?? "–"}% of {point.withOutcome} followed up
      </p>
    </div>
  );
}

export function LearningCurveChart({ points }: { points: LearningPoint[] }) {
  return (
    <Card>
      <SectionTitle hint="simulated field data">Learning curve, all villages</SectionTitle>
      <p className="mb-3 text-sm text-muted">
        Per month: share of product advice the farmer accepted, and share of followed-up advice that controlled the issue.
        Computed from the demo data files, not from live usage.
      </p>
      <div className="h-64 w-full" role="img" aria-label="Line chart of monthly acceptance and control rates, April to September 2026">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {/* Controlled is dashed and drawn first so the accepted line stays visible where the rates coincide. */}
            <Line type="linear" dataKey="controlledPct" name="Issue controlled" stroke={TURMERIC} strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4 }} connectNulls />
            <Line type="linear" dataKey="acceptedPct" name="Advice accepted" stroke={LEAF} strokeWidth={2} dot={{ r: 3, fill: LEAF }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        Sample sizes are small ({points.map((p) => `${p.label} ${p.advised}`).join(", ")} advised visits) — hover a point for details.
      </p>
    </Card>
  );
}
