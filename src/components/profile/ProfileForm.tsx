"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProfileForm({
  initial,
}: {
  initial: { targetOverall: number; examDate: string | null; minutesPerDay: number; studyDays: number[] };
}) {
  const [targetOverall, setTargetOverall] = useState(initial.targetOverall);
  const [examDate, setExamDate] = useState(initial.examDate ?? "");
  const [minutesPerDay, setMinutesPerDay] = useState(initial.minutesPerDay);
  const [studyDays, setStudyDays] = useState(initial.studyDays);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetOverall, examDate: examDate || null, minutesPerDay, studyDays }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <p className="font-medium text-sm mb-4">Course settings</p>

      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Target overall band</label>
      <input
        type="range"
        min={5}
        max={9}
        step={0.5}
        value={targetOverall}
        onChange={(e) => setTargetOverall(Number(e.target.value))}
        className="w-full mb-1"
      />
      <p className="text-sm font-semibold mb-4">{targetOverall.toFixed(1)}</p>

      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Exam date</label>
      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm mb-4"
      />

      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Minutes per day</label>
      <input
        type="range"
        min={30}
        max={180}
        step={15}
        value={minutesPerDay}
        onChange={(e) => setMinutesPerDay(Number(e.target.value))}
        className="w-full mb-1"
      />
      <p className="text-sm font-semibold mb-4">{minutesPerDay} min</p>

      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Study days</label>
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {WEEKDAYS.map((d, i) => {
          const active = studyDays.includes(i);
          return (
            <button
              key={d}
              onClick={() => setStudyDays((sd) => (active ? sd.filter((x) => x !== i) : [...sd, i].sort()))}
              className="aspect-square rounded-lg text-xs font-medium"
              style={{
                background: active ? "var(--color-primary)" : "var(--color-surface-2)",
                color: active ? "white" : "var(--color-text-muted)",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
      </Button>
    </Card>
  );
}
