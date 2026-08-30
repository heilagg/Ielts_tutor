"use client";

import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

export interface ErrorEntryData {
  id: string;
  skill: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  severity: string;
  frequency: number;
  masteryStatus: string;
  lastSeenLabel: string;
}

const MASTERY_OPTIONS = ["ACTIVE", "IMPROVING", "MASTERED"] as const;
const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "var(--color-danger)",
  MEDIUM: "var(--color-warning)",
  LOW: "var(--color-text-muted)",
};

export function ErrorList({ initialErrors }: { initialErrors: ErrorEntryData[] }) {
  const [errors, setErrors] = useState(initialErrors);
  const [filter, setFilter] = useState<string>("ALL");

  const skills = ["ALL", ...Array.from(new Set(initialErrors.map((e) => e.skill)))];
  const visible = filter === "ALL" ? errors : errors.filter((e) => e.skill === filter);

  async function updateMastery(id: string, masteryStatus: string) {
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, masteryStatus } : e)));
    await fetch(`/api/errors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masteryStatus }),
    });
  }

  if (initialErrors.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-[var(--color-text-muted)]">
          No recurring mistakes logged yet. As you complete Reading, Listening, Writing, and Speaking
          tasks, patterns will show up here for targeted review.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {skills.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
              filter === s ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {e.skill} · {e.category}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: "white", background: SEVERITY_COLOR[e.severity] }}
              >
                {e.severity}
              </span>
            </div>
            <p className="text-sm mb-1">
              <span className="text-[var(--color-danger)]">✕</span> {e.original}
            </p>
            <p className="text-sm mb-1">
              <span className="text-[var(--color-success)]">✓</span> {e.corrected}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">{e.explanation}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Seen {e.frequency}x · last {e.lastSeenLabel}
              </span>
              <div className="flex gap-1">
                {MASTERY_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => updateMastery(e.id, m)}
                    className={clsx(
                      "px-2 py-1 rounded-md text-[10px] font-medium",
                      e.masteryStatus === m ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                    )}
                  >
                    {m === "ACTIVE" ? "Active" : m === "IMPROVING" ? "Improving" : "Mastered"}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
