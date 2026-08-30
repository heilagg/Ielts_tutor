import { requireProfile } from "@/lib/guards";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import { Card } from "@/components/ui/Card";
import { getAiUsageSummary } from "@/lib/ai/budget";
import { prisma } from "@/lib/prisma";
import { Award, Flame } from "lucide-react";

export default async function ProfilePage() {
  const user = await requireProfile();
  const studyDays = JSON.parse(user.profile.studyDays) as number[];
  const [usage, stats, achievements] = await Promise.all([
    getAiUsageSummary(user.id),
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.achievement.findMany({ where: { userId: user.id }, orderBy: { unlockedAt: "desc" } }),
  ]);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Exam</p>
            <p className="font-medium">IELTS {user.profile.examType === "ACADEMIC" ? "Academic" : "General Training"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Plan length</p>
            <p className="font-medium">{user.profile.planMonths} months</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <ProfileForm
          initial={{
            targetOverall: user.profile.targetOverall,
            examDate: user.profile.examDate ? user.profile.examDate.toISOString().slice(0, 10) : null,
            minutesPerDay: user.profile.minutesPerDay,
            studyDays,
          }}
        />
        <NotificationSettings />

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">Consistency</p>
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Flame size={13} /> Longest streak: {stats?.longestStreak ?? 0}d
            </div>
          </div>
          {achievements.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              No milestones unlocked yet — they show up automatically as you complete mocks, correct
              recurring mistakes, and hit band targets.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-[var(--color-surface-2)]" title={a.description}>
                  <Award size={12} className="text-[var(--color-primary)]" />
                  {a.title}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="font-medium text-sm mb-3">AI usage &amp; cost (estimated)</p>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Today</p>
              <p className="font-semibold">${usage.todayCostUsd.toFixed(3)}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{usage.todayCalls} calls</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">This month</p>
              <p className="font-semibold">${usage.monthCostUsd.toFixed(2)}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{usage.monthCalls} calls</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">All time</p>
              <p className="font-semibold">${usage.allTimeCostUsd.toFixed(2)}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{usage.allTimeCalls} calls</p>
            </div>
          </div>
          {usage.byFeature.length > 0 && (
            <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-3">
              {usage.byFeature.map((f) => (
                <div key={f.feature} className="flex justify-between">
                  <span>{f.feature}</span>
                  <span>${f.costUsd.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {usage.dailyLimitUsd || usage.monthlyLimitUsd
              ? `Limits: ${usage.dailyLimitUsd ? `$${usage.dailyLimitUsd}/day` : "no daily limit"}, ${usage.monthlyLimitUsd ? `$${usage.monthlyLimitUsd}/month` : "no monthly limit"}.`
              : "No spending limits set — configure AI_DAILY_COST_LIMIT_USD / AI_MONTHLY_COST_LIMIT_USD in .env to cap usage."}
            {" "}These are rough estimates from published per-token pricing, not your actual Anthropic invoice.
          </p>
        </Card>

        <Card>
          <p className="font-medium text-sm mb-1">About your data</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            All your scores, essays, transcripts, and mistakes are stored locally in this app&apos;s database
            and used only to personalize your course. AI-generated content is labelled AI_GENERATED_IELTS_STYLE
            and is never presented as official IELTS material.
          </p>
        </Card>
      </div>
    </div>
  );
}
