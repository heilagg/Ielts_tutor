import { prisma } from "@/lib/prisma";
import { getWeaknessSummary, planTodaysTasks, type SkillKey } from "@/lib/adaptive";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns today's DailyPlan (with tasks), generating it on first request of the day. */
export async function getOrCreateTodaysPlan(userId: string) {
  const today = startOfDay(new Date());

  const existing = await prisma.dailyPlan.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { tasks: true },
  });
  if (existing) return existing;

  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });
  const targets: Record<SkillKey, number> = {
    READING: profile.targetReading,
    LISTENING: profile.targetListening,
    WRITING: profile.targetWriting,
    SPEAKING: profile.targetSpeaking,
  };
  const weakness = await getWeaknessSummary(userId, targets);

  const priorPlanCount = await prisma.dailyPlan.count({ where: { userId } });

  const specs = planTodaysTasks({
    minutesPerDay: profile.minutesPerDay,
    weakness,
    examDate: profile.examDate,
    dayIndex: priorPlanCount,
  });

  const rationale =
    weakness.weakestSkill != null
      ? `Focused on ${weakness.weakestSkill.toLowerCase()} today since it's currently your lowest estimated band, plus a rotation task to keep other skills moving.`
      : "A balanced first week across all four skills while we gather more data on your strengths and weaknesses.";

  const plan = await prisma.dailyPlan.create({
    data: {
      userId,
      date: today,
      rationale,
      tasks: {
        create: specs.map((s) => ({
          userId,
          skill: s.skill,
          subskill: s.subskill,
          difficulty: s.difficulty,
          title: s.title,
          purpose: s.purpose,
          mode: "STUDY",
          sourceLabel: "AI_GENERATED_IELTS_STYLE",
          payload: JSON.stringify({ estMinutes: s.estMinutes }),
        })),
      },
    },
    include: { tasks: true },
  });

  return plan;
}

export async function markTaskDone(userId: string, taskId: string) {
  await prisma.task.updateMany({ where: { id: taskId, userId }, data: { status: "DONE" } });
}

/**
 * Section 57 ("I have 30/60/120 minutes"): an ad-hoc, non-persisted session sized to
 * exactly the time the student says they have right now, built from the same weakness
 * data as the daily plan. Doesn't touch the DailyPlan/Task tables — it's a one-off.
 */
export async function buildQuickSession(userId: string, minutes: number) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });
  const targets: Record<SkillKey, number> = {
    READING: profile.targetReading,
    LISTENING: profile.targetListening,
    WRITING: profile.targetWriting,
    SPEAKING: profile.targetSpeaking,
  };
  const weakness = await getWeaknessSummary(userId, targets);
  const dayIndex = Math.floor(Date.now() / 86_400_000);

  return planTodaysTasks({ minutesPerDay: minutes, weakness, examDate: profile.examDate, dayIndex });
}

/** Section 58 (low-motivation mode): true if the student has missed 2+ consecutive days. */
export async function isLowMotivationWindow(userId: string): Promise<boolean> {
  const lastActivity = await prisma.scoreHistory.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!lastActivity) return false;
  const daysSinceLast = Math.floor((Date.now() - lastActivity.createdAt.getTime()) / 86_400_000);
  return daysSinceLast >= 2;
}
