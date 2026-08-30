"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEVELS = [
  { value: "A2", label: "A2 — Elementary" },
  { value: "B1", label: "B1 — Intermediate" },
  { value: "B2", label: "B2 — Upper-Intermediate" },
  { value: "C1", label: "C1 — Advanced" },
  { value: "C2", label: "C2 — Proficient" },
  { value: "unsure", label: "Not sure — that's fine" },
];

type FormState = {
  examType: "ACADEMIC" | "GENERAL_TRAINING";
  targetOverall: number;
  examDate: string;
  selfEstimatedLevel: string | null;
  minutesPerDay: number;
  studyDays: number[];
  wantsSixMonths: boolean;
  planMonths: number;
};

const STEPS = ["Exam", "Target", "Exam date", "Level", "Daily time", "Study days", "Timeline"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    examType: "ACADEMIC",
    targetOverall: 7.5,
    examDate: "",
    selfEstimatedLevel: null,
    minutesPerDay: 75,
    studyDays: [1, 2, 3, 4, 5],
    wantsSixMonths: true,
    planMonths: 6,
  });

  const isLast = step === STEPS.length - 1;
  const canAdvance = (() => {
    switch (step) {
      case 0:
        return Boolean(form.examType);
      case 1:
        return Boolean(form.targetOverall);
      default:
        return true;
    }
  })();

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: form.examType,
          targetOverall: form.targetOverall,
          examDate: form.examDate || null,
          selfEstimatedLevel: form.selfEstimatedLevel,
          minutesPerDay: form.minutesPerDay,
          studyDays: form.studyDays,
          planMonths: form.wantsSixMonths ? 6 : form.planMonths,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      router.push("/diagnostic");
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] safe-top safe-bottom">
      <div className="max-w-lg w-full mx-auto flex-1 flex flex-col px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold">
            7.5
          </div>
          <div>
            <p className="font-semibold leading-tight">IELTS 7.5 Coach</p>
            <p className="text-xs text-[var(--color-text-muted)] leading-tight">Let&apos;s set up your course</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= step ? "var(--color-primary)" : "var(--color-border)" }}
            />
          ))}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <StepShell title="Which test are you preparing for?">
              <div className="flex flex-col gap-3">
                {(
                  [
                    ["ACADEMIC", "Academic", "For university admission or professional registration."],
                    ["GENERAL_TRAINING", "General Training", "For work experience or migration purposes."],
                  ] as const
                ).map(([value, label, desc]) => (
                  <OptionCard
                    key={value}
                    selected={form.examType === value}
                    onClick={() => setForm((f) => ({ ...f, examType: value }))}
                    title={label}
                    desc={desc}
                  />
                ))}
              </div>
              {form.examType === "GENERAL_TRAINING" && (
                <p className="mt-3 text-xs text-[var(--color-warning)]">
                  This coach is tuned for IELTS Academic (Reading/Writing task types differ for General
                  Training). You can continue, but material will follow the Academic format.
                </p>
              )}
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="What overall band score are you aiming for?">
              <div className="text-center py-6">
                <div className="text-6xl font-bold tabular-nums" style={{ color: "var(--color-primary-2)" }}>
                  {form.targetOverall.toFixed(1)}
                </div>
                <input
                  type="range"
                  min={5}
                  max={9}
                  step={0.5}
                  value={form.targetOverall}
                  onChange={(e) => setForm((f) => ({ ...f, targetOverall: Number(e.target.value) }))}
                  className="w-full mt-6"
                />
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                  <span>5.0</span>
                  <span>9.0</span>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                Default target is 7.5 — the recommended goal for most competitive university and skilled-visa
                requirements.
              </p>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="When is your exam?" subtitle="Leave blank if you haven't booked one yet.">
              <input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base"
              />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="What's your current English level?" subtitle="A rough guess is fine — the diagnostic will refine this.">
              <div className="flex flex-col gap-2.5">
                {LEVELS.map((l) => (
                  <OptionCard
                    key={l.value}
                    selected={form.selfEstimatedLevel === l.value}
                    onClick={() => setForm((f) => ({ ...f, selfEstimatedLevel: l.value }))}
                    title={l.label}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="How much time can you study per day?">
              <div className="text-center py-6">
                <div className="text-6xl font-bold tabular-nums" style={{ color: "var(--color-primary-2)" }}>
                  {form.minutesPerDay}
                  <span className="text-2xl font-medium text-[var(--color-text-muted)]"> min</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={180}
                  step={15}
                  value={form.minutesPerDay}
                  onChange={(e) => setForm((f) => ({ ...f, minutesPerDay: Number(e.target.value) }))}
                  className="w-full mt-6"
                />
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                  <span>30 min</span>
                  <span>3 hrs</span>
                </div>
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Which days can you study?">
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map((d, i) => {
                  const active = form.studyDays.includes(i);
                  return (
                    <button
                      key={d}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          studyDays: active ? f.studyDays.filter((x) => x !== i) : [...f.studyDays, i].sort(),
                        }))
                      }
                      className={clsx(
                        "aspect-square rounded-xl text-sm font-medium flex items-center justify-center min-h-11",
                        active
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                {form.studyDays.length} day{form.studyDays.length === 1 ? "" : "s"} per week selected.
              </p>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="Course length" subtitle="A 6-month structured plan gives the most reliable path to 7.5.">
              <div className="flex flex-col gap-3">
                <OptionCard
                  selected={form.wantsSixMonths}
                  onClick={() => setForm((f) => ({ ...f, wantsSixMonths: true }))}
                  title="~6 months (recommended)"
                  desc="Foundation → skill-building → timed practice → advanced training → optimization → exam simulation."
                />
                <OptionCard
                  selected={!form.wantsSixMonths}
                  onClick={() => setForm((f) => ({ ...f, wantsSixMonths: false }))}
                  title="Custom length"
                />
              </div>
              {!form.wantsSixMonths && (
                <div className="mt-4">
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={form.planMonths}
                    onChange={(e) => setForm((f) => ({ ...f, planMonths: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-center text-sm mt-1">{form.planMonths} month(s)</p>
                </div>
              )}
            </StepShell>
          )}
        </div>

        {error && <p className="text-sm text-[var(--color-danger)] mb-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            disabled={!canAdvance || submitting}
            onClick={() => (isLast ? handleSubmit() : setStep((s) => s + 1))}
          >
            {isLast ? (submitting ? "Saving..." : "Start diagnostic") : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--color-text-muted)] mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-left rounded-xl border px-4 py-3.5 transition-colors min-h-11",
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      )}
    >
      <p className="font-medium text-sm">{title}</p>
      {desc && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>}
    </button>
  );
}
