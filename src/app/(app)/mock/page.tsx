import { requireDiagnosticComplete } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getWeeklyMockStatus, getMonthlyMockStatus, type WeeklyMockKind } from "@/lib/mockExam";
import type { SkillKey } from "@/lib/adaptive";
import { Card } from "@/components/ui/Card";
import { StartTestButton } from "@/components/StartTestButton";

const SKILL_LABEL: Record<SkillKey, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const WEEKLY_KIND_LABEL: Record<WeeklyMockKind, string> = {
  WEEKLY_FULL: "Full mock",
  WEEKLY_RL: "Reading + Listening",
  WEEKLY_WS: "Writing + Speaking",
  WEEKLY_TARGETED: "Targeted weak-skill mock",
};

export default async function MockPage() {
  const user = await requireDiagnosticComplete();
  const targets: Record<SkillKey, number> = {
    READING: user.profile.targetReading,
    LISTENING: user.profile.targetListening,
    WRITING: user.profile.targetWriting,
    SPEAKING: user.profile.targetSpeaking,
  };

  const [weekly, monthly, history] = await Promise.all([
    getWeeklyMockStatus(user.id, targets, user.profile.createdAt),
    getMonthlyMockStatus(user.id),
    prisma.mockExam.findMany({ where: { userId: user.id, completedAt: { not: null } }, orderBy: { startedAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Mock exams</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Weekly check-ins rotate automatically; monthly mocks use entirely new material.
      </p>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-sm">This week: {WEEKLY_KIND_LABEL[weekly.kind]}</p>
          {weekly.allDone && <span className="text-xs font-medium text-[var(--color-success)]">Complete</span>}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          {weekly.kind === "WEEKLY_TARGETED"
            ? "Focused on your current weakest skill under full exam conditions."
            : "Exam Mode — strict timing, no hints, results revealed at the end."}
        </p>
        <div className="flex flex-col gap-3">
          {weekly.statuses.map((s) => (
            <MockSkillRow key={s.skill} skill={s.skill} done={s.done} band={s.band} mockKind="WEEKLY_MOCK" />
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-sm">Monthly full mock</p>
          {!monthly.dueForNewMonthly && <span className="text-xs text-[var(--color-text-muted)]">Not due yet</span>}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          A complete new-material exam across all four skills, once a month, to track real progress.
        </p>
        {monthly.dueForNewMonthly ? (
          <div className="flex flex-col gap-3">
            {monthly.statuses.map((s) => (
              <MockSkillRow key={s.skill} skill={s.skill} done={s.done} band={s.band} mockKind="MONTHLY_MOCK" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">Your next monthly mock unlocks 30 days after the last one.</p>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <p className="font-medium text-sm mb-3">Mock history</p>
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{h.kind.replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{new Date(h.startedAt).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold">{h.overallBand != null ? h.overallBand.toFixed(1) : "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MockSkillRow({ skill, done, band, mockKind }: { skill: SkillKey; done: boolean; band: number | null; mockKind: "WEEKLY_MOCK" | "MONTHLY_MOCK" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{SKILL_LABEL[skill]}</p>
        {done && band != null && <p className="text-xs text-[var(--color-text-muted)]">Band {band.toFixed(1)}</p>}
      </div>
      {done ? (
        <span className="text-xs font-medium text-[var(--color-success)]">Done</span>
      ) : (
        <SkillStartButton skill={skill} mockKind={mockKind} />
      )}
    </div>
  );
}

function SkillStartButton({ skill, mockKind }: { skill: SkillKey; mockKind: "WEEKLY_MOCK" | "MONTHLY_MOCK" }) {
  if (skill === "READING") {
    return (
      <StartTestButton
        generateUrl="/api/reading/generate"
        testUrlPrefix="/test/reading"
        body={{ kind: mockKind, mode: "EXAM", fullLength: true }}
        label="Start"
        size="sm"
      />
    );
  }
  if (skill === "LISTENING") {
    return (
      <StartTestButton
        generateUrl="/api/listening/generate"
        testUrlPrefix="/test/listening"
        body={{ kind: mockKind, mode: "EXAM", fullLength: true }}
        label="Start"
        size="sm"
      />
    );
  }
  if (skill === "WRITING") {
    return (
      <div className="flex gap-1.5">
        <StartTestButton generateUrl="/api/writing/generate" testUrlPrefix="/test/writing" body={{ kind: mockKind, mode: "EXAM", taskType: "TASK1" }} label="T1" size="sm" variant="secondary" />
        <StartTestButton generateUrl="/api/writing/generate" testUrlPrefix="/test/writing" body={{ kind: mockKind, mode: "EXAM", taskType: "TASK2" }} label="T2" size="sm" variant="secondary" />
      </div>
    );
  }
  return <StartTestButton generateUrl="/api/speaking/generate" testUrlPrefix="/test/speaking" body={{ kind: mockKind, mode: "EXAM" }} label="Start" size="sm" />;
}
