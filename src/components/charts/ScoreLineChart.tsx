"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";

export interface ScorePoint {
  date: string;
  band: number;
}

export function ScoreLineChart({ data, target }: { data: ScorePoint[]; target: number }) {
  if (data.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">No results yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis domain={[3, 9]} ticks={[3, 5, 7, 9]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <ReferenceLine y={target} stroke="var(--color-accent)" strokeDasharray="4 4" label={{ value: `Target ${target}`, fontSize: 10, fill: "var(--color-accent)" }} />
        <Line type="monotone" dataKey="band" stroke="var(--color-primary-2)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
