import { prisma } from "@/lib/prisma";

/**
 * Lightweight, non-primary gamification (sections 35-36). XP and streaks exist to
 * reward consistency and genuine improvement — not to become the point of the app.
 * Nothing here gates functionality; it's purely a small motivational layer on top of
 * data that's already tracked.
 */

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function recordStudyActivity(userId: string, xp: number = 10): Promise<void> {
  const today = dateKey(new Date());
  const stats = await prisma.userStats.findUnique({ where: { userId } });

  if (!stats) {
    await prisma.userStats.create({ data: { userId, xp, currentStreak: 1, longestStreak: 1, lastStudyDate: new Date() } });
    return;
  }

  const lastKey = stats.lastStudyDate ? dateKey(stats.lastStudyDate) : null;
  if (lastKey === today) {
    // Already logged activity today — just add XP, don't touch the streak twice in one day.
    await prisma.userStats.update({ where: { userId }, data: { xp: { increment: xp } } });
    return;
  }

  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  const continuesStreak = lastKey === yesterday;
  const newStreak = continuesStreak ? stats.currentStreak + 1 : 1;

  await prisma.userStats.update({
    where: { userId },
    data: {
      xp: { increment: xp },
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      lastStudyDate: new Date(),
    },
  });
}

interface AchievementDef {
  key: string;
  title: string;
  description: string;
  check: (userId: string) => Promise<boolean>;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_mock",
    title: "First full mock",
    description: "Completed your first mock exam.",
    check: async (userId) => (await prisma.mockExam.count({ where: { userId, completedAt: { not: null } } })) >= 1,
  },
  {
    key: "writing_x10",
    title: "10 essays submitted",
    description: "Submitted and received feedback on 10 Writing tasks.",
    check: async (userId) => (await prisma.writingSubmission.count({ where: { userId, overallBand: { not: null } } })) >= 10,
  },
  {
    key: "errors_100",
    title: "100 mistakes corrected",
    description: "Marked 100 recurring mistakes as mastered.",
    check: async (userId) => (await prisma.errorEntry.count({ where: { userId, masteryStatus: "MASTERED" } })) >= 100,
  },
  {
    key: "streak_7",
    title: "7-day streak",
    description: "Studied 7 days in a row.",
    check: async (userId) => {
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      return (stats?.longestStreak ?? 0) >= 7;
    },
  },
  {
    key: "reading_7",
    title: "Reading 7.0",
    description: "Reached an estimated Band 7.0 in Reading.",
    check: async (userId) => (await prisma.scoreHistory.count({ where: { userId, skill: "READING", band: { gte: 7 } } })) >= 1,
  },
  {
    key: "listening_7",
    title: "Listening 7.0",
    description: "Reached an estimated Band 7.0 in Listening.",
    check: async (userId) => (await prisma.scoreHistory.count({ where: { userId, skill: "LISTENING", band: { gte: 7 } } })) >= 1,
  },
  {
    key: "writing_65",
    title: "Writing 6.5",
    description: "Reached an estimated Band 6.5 in Writing.",
    check: async (userId) => (await prisma.scoreHistory.count({ where: { userId, skill: "WRITING", band: { gte: 6.5 } } })) >= 1,
  },
  {
    key: "speaking_7",
    title: "Speaking 7.0",
    description: "Reached an estimated Band 7.0 in Speaking.",
    check: async (userId) => (await prisma.scoreHistory.count({ where: { userId, skill: "SPEAKING", band: { gte: 7 } } })) >= 1,
  },
  {
    key: "overall_7",
    title: "First overall 7.0",
    description: "Reached an estimated Overall Band 7.0.",
    check: async (userId) => (await prisma.scoreHistory.count({ where: { userId, skill: "OVERALL", band: { gte: 7 } } })) >= 1,
  },
  {
    key: "target_reached",
    title: "Target reached",
    description: "Reached your target overall band.",
    check: async (userId) => {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return false;
      return (await prisma.scoreHistory.count({ where: { userId, skill: "OVERALL", band: { gte: profile.targetOverall } } })) >= 1;
    },
  },
];

/** Checks all achievement conditions and unlocks any newly-earned ones. Safe to call often — idempotent. */
export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const existing = await prisma.achievement.findMany({ where: { userId }, select: { key: true } });
  const existingKeys = new Set(existing.map((e) => e.key));
  const newlyUnlocked: string[] = [];

  for (const def of ACHIEVEMENTS) {
    if (existingKeys.has(def.key)) continue;
    if (await def.check(userId)) {
      await prisma.achievement.create({ data: { userId, key: def.key, title: def.title, description: def.description } });
      newlyUnlocked.push(def.key);
    }
  }
  return newlyUnlocked;
}
