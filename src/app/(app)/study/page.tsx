import Link from "next/link";
import { requireDiagnosticComplete } from "@/lib/guards";
import { getCurrentPhase, ROADMAP } from "@/lib/curriculum";
import { getWeaknessSummary, type SkillKey } from "@/lib/adaptive";
import { prisma } from "@/lib/prisma";
import { daysSince } from "@/lib/streak";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

export default async function StudyPage() {
  const user = await requireDiagnosticComplete();
  const targets: Record<SkillKey, number> = {
    READING: user.profile.targetReading,
    LISTENING: user.profile.targetListening,
    WRITING: user.profile.targetWriting,
    SPEAKING: user.profile.targetSpeaking,
  };

  const [phase, weakness, lastWeeklyMock] = await Promise.all([
    Promise.resolve(getCurrentPhase(user.profile.createdAt, user.profile.planMonths)),
    getWeaknessSummary(user.id, targets),
    prisma.mockExam.findFirst({ where: { userId: user.id, kind: { startsWith: "WEEKLY" } }, orderBy: { startedAt: "desc" } }),
  ]);

  const weeklyMockDue = !lastWeeklyMock || daysSince(lastWeeklyMock.startedAt) > 7;

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Study</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Your six-month curriculum, adapted to your diagnostic and ongoing performance.
      </p>

      <Card className="mb-6">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
          Month {phase.month} of {ROADMAP.length} — current phase
        </p>
        <p className="font-semibold mb-1">{phase.title}</p>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">{phase.desc}</p>
        <div className="flex flex-wrap gap-2">
          {phase.focus.map((f) => (
            <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-2)]">
              {f}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-sm">Weekly mock</p>
          {weeklyMockDue ? (
            <span className="text-xs font-medium text-[var(--color-warning)]">Due</span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">
              Last: {lastWeeklyMock ? new Date(lastWeeklyMock.startedAt).toLocaleDateString() : "—"}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          A rotating weekly check-in — full mock, Reading + Listening, Writing + Speaking, or a targeted
          weak-skill set.
        </p>
        <Link href="/mock">
          <Button size="md" variant={weeklyMockDue ? "primary" : "secondary"} className="w-full">
            Go to Mock Exams
          </Button>
        </Link>
      </Card>

      <Card className="mb-6">
        <p className="font-medium text-sm mb-3">This week&apos;s focus</p>
        <ul className="flex flex-col gap-2 text-sm">
          {weakness.topErrorCategories.slice(0, 4).map((e, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {e.skill} — {e.category}
              </span>
              <span className="text-[var(--color-text-muted)]">{e.frequency}x</span>
            </li>
          ))}
          {weakness.topErrorCategories.length === 0 && (
            <li className="text-[var(--color-text-muted)]">No recurring errors logged yet — keep practicing.</li>
          )}
        </ul>
      </Card>

      <Card>
        <p className="font-medium text-sm mb-3">Full roadmap</p>
        <div className="flex flex-col gap-3">
          {ROADMAP.map((r) => (
            <div key={r.month} className="flex gap-3">
              <div
                className={clsx(
                  "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
                  r.month === phase.month ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                )}
              >
                {r.month}
              </div>
              <div>
                <p className={clsx("text-sm", r.month === phase.month ? "font-semibold" : "font-medium")}>{r.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
