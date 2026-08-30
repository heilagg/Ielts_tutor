import { prisma } from "@/lib/prisma";
import { getWeaknessSummary, type SkillKey } from "@/lib/adaptive";
import { overallBandFromComponents, roundToHalfBand } from "@/lib/scoring/band";
import { checkAndUnlockAchievements } from "@/lib/gamification";

export const WEEKLY_ROTATION = ["WEEKLY_FULL", "WEEKLY_RL", "WEEKLY_WS", "WEEKLY_TARGETED"] as const;
export type WeeklyMockKind = (typeof WEEKLY_ROTATION)[number];

const DAY = 86_400_000;

export function getCurrentWeeklyMockKind(profileCreatedAt: Date): WeeklyMockKind {
  const weekNumber = Math.floor((Date.now() - profileCreatedAt.getTime()) / (7 * DAY));
  return WEEKLY_ROTATION[((weekNumber % 4) + 4) % 4];
}

export async function getSkillsForWeeklyMock(userId: string, kind: WeeklyMockKind, targets: Record<SkillKey, number>): Promise<SkillKey[]> {
  if (kind === "WEEKLY_FULL") return ["READING", "LISTENING", "WRITING", "SPEAKING"];
  if (kind === "WEEKLY_RL") return ["READING", "LISTENING"];
  if (kind === "WEEKLY_WS") return ["WRITING", "SPEAKING"];
  // WEEKLY_TARGETED
  const weakness = await getWeaknessSummary(userId, targets);
  return weakness.weakestSkill ? [weakness.weakestSkill] : ["READING", "LISTENING", "WRITING", "SPEAKING"];
}

interface SkillStatus {
  skill: SkillKey;
  done: boolean;
  band: number | null;
}

async function getLatestBandSince(userId: string, skill: SkillKey, kind: string, since: Date): Promise<number | null> {
  if (skill === "READING") {
    const r = await prisma.readingAttempt.findFirst({ where: { userId, kind, submittedAt: { gte: since, not: null } }, orderBy: { submittedAt: "desc" } });
    return r?.band ?? null;
  }
  if (skill === "LISTENING") {
    const l = await prisma.listeningAttempt.findFirst({ where: { userId, kind, submittedAt: { gte: since, not: null } }, orderBy: { submittedAt: "desc" } });
    return l?.band ?? null;
  }
  if (skill === "WRITING") {
    const [t1, t2] = await Promise.all([
      prisma.writingSubmission.findFirst({ where: { userId, kind, taskType: "TASK1", overallBand: { not: null }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.writingSubmission.findFirst({ where: { userId, kind, taskType: "TASK2", overallBand: { not: null }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
    ]);
    if (t1?.overallBand != null && t2?.overallBand != null) return roundToHalfBand((t1.overallBand + t2.overallBand) / 2);
    return null;
  }
  // SPEAKING
  const s = await prisma.speakingSession.findFirst({ where: { userId, kind, overallBand: { not: null }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } });
  return s?.overallBand ?? null;
}

export async function getWeeklyMockStatus(userId: string, targets: Record<SkillKey, number>, profileCreatedAt: Date) {
  const kind = getCurrentWeeklyMockKind(profileCreatedAt);
  const requiredSkills = await getSkillsForWeeklyMock(userId, kind, targets);
  const since = new Date(Date.now() - 7 * DAY);

  const statuses: SkillStatus[] = await Promise.all(
    requiredSkills.map(async (skill) => {
      const band = await getLatestBandSince(userId, skill, "WEEKLY_MOCK", since);
      return { skill, done: band !== null, band };
    })
  );

  const allDone = statuses.every((s) => s.done);
  const existingRecord = await prisma.mockExam.findFirst({ where: { userId, kind, startedAt: { gte: since } }, orderBy: { startedAt: "desc" } });

  if (allDone && !existingRecord) {
    await recordMockExam(userId, kind, statuses);
  }

  return { kind, requiredSkills, statuses, allDone };
}

async function recordMockExam(userId: string, kind: string, statuses: SkillStatus[]) {
  const bandMap = Object.fromEntries(statuses.map((s) => [s.skill, s.band])) as Partial<Record<SkillKey, number>>;
  const allFour = statuses.length === 4 && statuses.every((s) => s.band !== null);
  const overallBand = allFour
    ? overallBandFromComponents({
        listening: bandMap.LISTENING!,
        reading: bandMap.READING!,
        writing: bandMap.WRITING!,
        speaking: bandMap.SPEAKING!,
      })
    : null;

  await prisma.mockExam.create({
    data: {
      userId,
      kind,
      skillsIncluded: JSON.stringify(statuses.map((s) => s.skill)),
      overallBand,
      readingBand: bandMap.READING ?? null,
      listeningBand: bandMap.LISTENING ?? null,
      writingBand: bandMap.WRITING ?? null,
      speakingBand: bandMap.SPEAKING ?? null,
      completedAt: new Date(),
    },
  });
  await checkAndUnlockAchievements(userId);
}

export async function getMonthlyMockStatus(userId: string) {
  const since = new Date(Date.now() - 30 * DAY);
  const requiredSkills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];

  const statuses: SkillStatus[] = await Promise.all(
    requiredSkills.map(async (skill) => {
      const band = await getLatestBandSince(userId, skill, "MONTHLY_MOCK", since);
      return { skill, done: band !== null, band };
    })
  );

  const allDone = statuses.every((s) => s.done);
  const existingRecord = await prisma.mockExam.findFirst({ where: { userId, kind: "MONTHLY_FULL", startedAt: { gte: since } }, orderBy: { startedAt: "desc" } });

  if (allDone && !existingRecord) {
    await recordMockExam(userId, "MONTHLY_FULL", statuses);
  }

  const lastCompleted = await prisma.mockExam.findFirst({ where: { userId, kind: "MONTHLY_FULL" }, orderBy: { startedAt: "desc" } });
  const dueForNewMonthly = !lastCompleted || lastCompleted.startedAt.getTime() < since.getTime();

  return { requiredSkills, statuses, allDone, dueForNewMonthly };
}
