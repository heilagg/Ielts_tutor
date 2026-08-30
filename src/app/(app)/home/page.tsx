import Link from "next/link";
import { requireDiagnosticComplete } from "@/lib/guards";
import { predictScore } from "@/lib/scoring/predict";
import { getOrCreateTodaysPlan } from "@/lib/dailyPlan";
import { computeStudyStreak, daysUntil } from "@/lib/streak";
import { getWeaknessSummary, type SkillKey } from "@/lib/adaptive";
import { isLowMotivationWindow } from "@/lib/dailyPlan";
import { prisma } from "@/lib/prisma";
import { ScoreHeader } from "@/components/dashboard/ScoreHeader";
import { DailyPlanList } from "@/components/dashboard/DailyPlanList";
import { QuickSessionPicker } from "@/components/dashboard/QuickSessionPicker";
import { Card } from "@/components/ui/Card";
import { Flame, CalendarClock, HelpCircle } from "lucide-react";

const SKILL_LABEL: Record<SkillKey, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

export default async function HomePage() {
  const user = await requireDiagnosticComplete();
  const targets: Record<SkillKey, number> = {
    READING: user.profile.targetReading,
    LISTENING: user.profile.targetListening,
    WRITING: user.profile.targetWriting,
    SPEAKING: user.profile.targetSpeaking,
  };

  const [prediction, plan, streak, weakness, recentScore, lowMotivation] = await Promise.all([
    predictScore({ userId: user.id, targets, overallTarget: user.profile.targetOverall, examDate: user.profile.examDate }),
    getOrCreateTodaysPlan(user.id),
    computeStudyStreak(user.id),
    getWeaknessSummary(user.id, targets),
    prisma.scoreHistory.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    isLowMotivationWindow(user.id),
  ]);

  const daysToExam = user.profile.examDate ? daysUntil(user.profile.examDate) : null;

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <ScoreHeader prediction={prediction} />

      <Link
        href="/progress/why-not-yet"
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--color-primary-2)] mb-6 -mt-3"
      >
        <HelpCircle size={13} /> Why am I not {prediction.target.toFixed(1)} yet?
      </Link>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatTile icon={Flame} label="Streak" value={`${streak}d`} />
        <StatTile
          icon={CalendarClock}
          label="Exam in"
          value={daysToExam != null ? `${daysToExam}d` : "—"}
        />
        <StatTile
          label="Weakest"
          value={weakness.weakestSkill ? SKILL_LABEL[weakness.weakestSkill] : "—"}
        />
      </div>

      {lowMotivation ? (
        <Card className="mb-6 bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
          <p className="font-medium text-sm mb-1">Welcome back</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            It&apos;s been a couple of days — no penalty, no doubled-up workload. Here&apos;s a short session to restart the habit.
          </p>
          <QuickSessionPicker recoveryMode />
        </Card>
      ) : (
        <QuickSessionPicker />
      )}

      <DailyPlanList tasks={plan.tasks} rationale={plan.rationale} />

      {recentScore && (
        <Card>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Most recent result</p>
          <p className="text-sm">
            <span className="font-semibold">{recentScore.skill}</span> — Band {recentScore.band.toFixed(1)} (
            {recentScore.source.toLowerCase()})
          </p>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="text-center py-4">
      {Icon && <Icon size={16} className="mx-auto mb-1 text-[var(--color-text-muted)]" />}
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
    </Card>
  );
}
