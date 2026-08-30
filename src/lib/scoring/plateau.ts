import { prisma } from "@/lib/prisma";
import type { SkillKey } from "@/lib/adaptive";

export interface PlateauResult {
  skill: SkillKey;
  isPlateaued: boolean;
  plateauBand: number | null;
  sinceDate: Date | null;
  likelyCauses: string[];
}

/**
 * Section 39 (plateau detection): a skill has "stopped improving" if its last several
 * scores sit in a narrow band over a long-enough span of time. When that's true, we
 * also try to diagnose *why* using the same error/question-type data the daily planner
 * already tracks, rather than just reporting the flat line.
 */
export async function detectPlateau(userId: string, skill: SkillKey): Promise<PlateauResult> {
  const history = await prisma.scoreHistory.findMany({
    where: { userId, skill },
    orderBy: { createdAt: "asc" },
  });

  if (history.length < 4) {
    return { skill, isPlateaued: false, plateauBand: null, sinceDate: null, likelyCauses: [] };
  }

  const recent = history.slice(-6);
  const bands = recent.map((r) => r.band);
  const range = Math.max(...bands) - Math.min(...bands);
  const spanDays = (recent[recent.length - 1].createdAt.getTime() - recent[0].createdAt.getTime()) / 86_400_000;

  const isPlateaued = recent.length >= 4 && range <= 0.5 && spanDays >= 14;
  if (!isPlateaued) {
    return { skill, isPlateaued: false, plateauBand: null, sinceDate: null, likelyCauses: [] };
  }

  const plateauBand = Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
  const sinceDate = recent[0].createdAt;

  const likelyCauses: string[] = [];
  const topErrors = await prisma.errorEntry.findMany({
    where: { userId, skill, masteryStatus: { not: "MASTERED" } },
    orderBy: { frequency: "desc" },
    take: 2,
  });
  if (topErrors.length > 0) {
    likelyCauses.push(`Same recurring mistakes not yet corrected: ${topErrors.map((e) => e.category).join(", ")}.`);
  }

  const recentAttemptCount = await countRecentAttempts(userId, skill, 21);
  if (recentAttemptCount <= 1) {
    likelyCauses.push("Very little recent practice volume in this skill — a plateau with low practice usually means insufficient reps, not a hard ceiling.");
  }

  if (skill === "WRITING") {
    const submissions = await prisma.writingSubmission.findMany({
      where: { userId, overallBand: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    if (submissions.length >= 3) {
      const taVar = variance(submissions.map((s) => s.taskAchievement ?? 0));
      const grammarVar = variance(submissions.map((s) => s.grammaticalRange ?? 0));
      if (taVar < grammarVar) likelyCauses.push("Task Achievement/Response has moved less than Grammar recently — content and argument development may be the limiting criterion, not language accuracy.");
    }
  }

  if (likelyCauses.length === 0) {
    likelyCauses.push("No obvious single cause in the data yet — consider whether feedback is being acted on, or whether it's time for a harder difficulty level.");
  }

  return { skill, isPlateaued: true, plateauBand, sinceDate, likelyCauses };
}

async function countRecentAttempts(userId: string, skill: SkillKey, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000);
  if (skill === "READING") return prisma.readingAttempt.count({ where: { userId, submittedAt: { gte: since } } });
  if (skill === "LISTENING") return prisma.listeningAttempt.count({ where: { userId, submittedAt: { gte: since } } });
  if (skill === "WRITING") return prisma.writingSubmission.count({ where: { userId, createdAt: { gte: since }, overallBand: { not: null } } });
  return prisma.speakingSession.count({ where: { userId, createdAt: { gte: since }, overallBand: { not: null } } });
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

export async function detectAllPlateaus(userId: string): Promise<PlateauResult[]> {
  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  return Promise.all(skills.map((s) => detectPlateau(userId, s)));
}
