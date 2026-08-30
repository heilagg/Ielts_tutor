"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlanTaskCard, type SimplePlanTask } from "@/components/dashboard/DailyPlanList";
import { Loader2, Clock } from "lucide-react";
import clsx from "clsx";

const PRESETS = [30, 60, 120];

interface RawTask {
  skill: string;
  title: string;
  purpose: string;
  estMinutes: number;
}

export function QuickSessionPicker({ recoveryMode = false }: { recoveryMode?: boolean }) {
  const [open, setOpen] = useState(recoveryMode);
  const [loading, setLoading] = useState<number | null>(null);
  const [tasks, setTasks] = useState<SimplePlanTask[] | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);

  async function pick(mins: number) {
    setLoading(mins);
    setTasks(null);
    try {
      const res = await fetch("/api/plan/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: mins }),
      });
      const data = await res.json();
      setTasks((data.tasks as RawTask[]).map((t) => ({ skill: t.skill, title: t.title, purpose: t.purpose, estMinutes: t.estMinutes })));
      setMinutes(mins);
    } finally {
      setLoading(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-primary-2)] py-2 mb-8"
      >
        <Clock size={14} /> I have limited time — build me a quick session
      </button>
    );
  }

  if (recoveryMode) {
    return (
      <div>
        {!tasks ? (
          <Button variant="primary" size="lg" className="w-full" disabled={loading !== null} onClick={() => pick(20)}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Start 20-minute recovery session"}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((t, i) => (
              <PlanTaskCard key={i} task={t} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <p className="text-sm font-medium mb-2">How much time do you have right now?</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {PRESETS.map((m) => (
          <Button
            key={m}
            variant={minutes === m ? "primary" : "secondary"}
            size="md"
            disabled={loading !== null}
            onClick={() => pick(m)}
            className={clsx(loading === m && "opacity-70")}
          >
            {loading === m ? <Loader2 size={14} className="animate-spin" /> : `${m} min`}
          </Button>
        ))}
      </div>
      {tasks && (
        <div className="flex flex-col gap-3">
          {tasks.map((t, i) => (
            <PlanTaskCard key={i} task={t} />
          ))}
          {tasks.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">Not enough time budget for a full task — try a longer session.</p>}
        </div>
      )}
    </div>
  );
}
