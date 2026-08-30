"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { WritingTask1 } from "@/lib/ai/schemas";

const SERIES_COLORS = ["#1e3a8a", "#0f766e", "#b45309", "#7c3aed", "#be123c"];

export function Task1Visual({ task }: { task: WritingTask1 }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold mb-3 text-center">{task.chartTitle}</p>
      {(task.visualType === "line" || task.visualType === "mixed") && task.chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={task.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {(task.chartSeries ?? []).map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {task.visualType === "bar" && task.chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={task.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {(task.chartSeries ?? []).map((s, i) => (
              <Bar key={s} dataKey={s} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {task.visualType === "pie" && task.chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={task.chartData} dataKey="value" nameKey="label" outerRadius={100} label>
              {task.chartData.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}

      {task.visualType === "table" && task.tableData && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {task.tableData.headers.map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 border-b border-[var(--color-border)] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {task.tableData.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 border-b border-[var(--color-border)]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task.visualType === "process" && task.processSteps && (
        <ol className="flex flex-col gap-2">
          {task.processSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      {task.visualType === "map" && (
        <p className="text-xs text-[var(--color-text-muted)] italic">
          Map/location described in the task prompt above.
        </p>
      )}
    </div>
  );
}
