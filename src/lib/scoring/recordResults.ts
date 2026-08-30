import { prisma } from "@/lib/prisma";
import type { SkillKey } from "@/lib/adaptive";
import { getWeightedSkillEstimate } from "@/lib/adaptive";
import { overallBandFromComponents, roundToHalfBand } from "@/lib/scoring/band";
import { recordStudyActivity, checkAndUnlockAchievements } from "@/lib/gamification";

export async function recordSkillScore(opts: {
  userId: string;
  skill: SkillKey;
  band: number;
  source: string;
  refId?: string;
}) {
  await prisma.scoreHistory.create({
    data: { userId: opts.userId, skill: opts.skill, band: opts.band, source: opts.source, refId: opts.refId },
  });
  await recomputeOverall(opts.userId, opts.source);
  await recordStudyActivity(opts.userId);
  await checkAndUnlockAchievements(opts.userId);
}

async function recomputeOverall(userId: string, source: string) {
  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const estimates = {} as Record<SkillKey, number | null>;
  for (const skill of skills) estimates[skill] = await getWeightedSkillEstimate(userId, skill);

  const known = skills.filter((s) => estimates[s] !== null);
  if (known.length === 0) return;

  const overall =
    known.length === 4
      ? overallBandFromComponents({
          listening: estimates.LISTENING!,
          reading: estimates.READING!,
          writing: estimates.WRITING!,
          speaking: estimates.SPEAKING!,
        })
      : roundToHalfBand(known.reduce((s, k) => s + estimates[k]!, 0) / known.length);

  await prisma.scoreHistory.create({
    data: { userId, skill: "OVERALL", band: overall, source },
  });
  await prisma.progressMetric.create({
    data: { userId, metric: "estimated_overall", value: overall },
  });
}

/** Records or reinforces a recurring-mistake entry so the adaptive planner and Errors page pick it up. */
export async function upsertErrorEntry(opts: {
  userId: string;
  skill: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
}) {
  const existing = await prisma.errorEntry.findFirst({
    where: { userId: opts.userId, skill: opts.skill, category: opts.category },
    orderBy: { lastSeenAt: "desc" },
  });
  if (existing) {
    // Forgetting detection (section 40): if a mastered/improving item resurfaces, that's
    // a real signal it wasn't actually learned — reset its spaced-repetition schedule so
    // it comes back into rotation immediately instead of staying "mastered" incorrectly.
    await prisma.errorEntry.update({
      where: { id: existing.id },
      data: {
        frequency: { increment: 1 },
        lastSeenAt: new Date(),
        original: opts.original,
        corrected: opts.corrected,
        explanation: opts.explanation,
        masteryStatus: "ACTIVE",
        repetitionCount: 0,
        intervalDays: 0,
        dueAt: new Date(),
      },
    });
  } else {
    await prisma.errorEntry.create({
      data: {
        userId: opts.userId,
        skill: opts.skill,
        category: opts.category,
        original: opts.original,
        corrected: opts.corrected,
        explanation: opts.explanation,
        severity: opts.severity ?? "MEDIUM",
      },
    });
  }
}
