import { prisma } from "@/lib/prisma";
import { overallBandFromComponents, roundToHalfBand } from "@/lib/scoring/band";
import { getWeightedSkillEstimate, type SkillKey } from "@/lib/adaptive";

export interface ScorePrediction {
  currentEstimate: number;
  componentEstimates: Record<SkillKey, number | null>;
  target: number;
  gap: number;
  trend: "improving" | "flat" | "declining" | "insufficient_data";
  trendDeltaPerMonth: number | null;
  readinessProbability: number | null; // 0-1
  readinessLabel: string;
}

/**
 * Estimates current overall band from a recency-weighted average per skill (recent
 * results count more than old ones — NOT a simple lifetime average), derives a trend
 * from the last 60 days of ScoreHistory vs the 60 days before that, and produces a
 * rough readiness probability given months remaining until the exam.
 */
export async function predictScore(opts: {
  userId: string;
  targets: Record<SkillKey, number>;
  overallTarget: number;
  examDate: Date | null;
}): Promise<ScorePrediction> {
  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const componentEstimates = {} as Record<SkillKey, number | null>;
  for (const skill of skills) {
    componentEstimates[skill] = await getWeightedSkillEstimate(opts.userId, skill);
  }

  const knownComponents = skills.filter((s) => componentEstimates[s] !== null);
  const currentEstimate =
    knownComponents.length === 4
      ? overallBandFromComponents({
          listening: componentEstimates.LISTENING!,
          reading: componentEstimates.READING!,
          writing: componentEstimates.WRITING!,
          speaking: componentEstimates.SPEAKING!,
        })
      : knownComponents.length > 0
      ? roundToHalfBand(
          knownComponents.reduce((sum, s) => sum + componentEstimates[s]!, 0) / knownComponents.length
        )
      : 0;

  // Trend: compare mean OVERALL score history in the last 60 days vs the prior 60 days.
  const now = Date.now();
  const day = 86_400_000;
  const recentWindow = await prisma.scoreHistory.findMany({
    where: { userId: opts.userId, skill: "OVERALL", createdAt: { gte: new Date(now - 60 * day) } },
    orderBy: { createdAt: "asc" },
  });
  const priorWindow = await prisma.scoreHistory.findMany({
    where: {
      userId: opts.userId,
      skill: "OVERALL",
      createdAt: { gte: new Date(now - 120 * day), lt: new Date(now - 60 * day) },
    },
  });

  let trend: ScorePrediction["trend"] = "insufficient_data";
  let trendDeltaPerMonth: number | null = null;
  if (recentWindow.length >= 2) {
    const recentMean = recentWindow.reduce((s, r) => s + r.band, 0) / recentWindow.length;
    if (priorWindow.length >= 1) {
      const priorMean = priorWindow.reduce((s, r) => s + r.band, 0) / priorWindow.length;
      const delta = recentMean - priorMean;
      trendDeltaPerMonth = Math.round(delta * 100) / 100;
      trend = delta > 0.1 ? "improving" : delta < -0.1 ? "declining" : "flat";
    } else {
      // Fall back to slope within the recent window itself.
      const first = recentWindow[0].band;
      const last = recentWindow[recentWindow.length - 1].band;
      const spanDays = Math.max(1, (recentWindow[recentWindow.length - 1].createdAt.getTime() - recentWindow[0].createdAt.getTime()) / day);
      trendDeltaPerMonth = Math.round(((last - first) / spanDays) * 30 * 100) / 100;
      trend = last - first > 0.1 ? "improving" : last - first < -0.1 ? "declining" : "flat";
    }
  }

  const gap = Math.round((opts.overallTarget - currentEstimate) * 100) / 100;

  let readinessProbability: number | null = null;
  let readinessLabel = "Not enough data yet to estimate readiness.";
  if (opts.examDate && knownComponents.length > 0) {
    const monthsLeft = Math.max(0, (opts.examDate.getTime() - now) / (30 * day));
    const paceDeltaPerMonth = trendDeltaPerMonth ?? 0.15; // conservative default pace assumption
    const projected = currentEstimate + paceDeltaPerMonth * monthsLeft;
    const margin = projected - opts.overallTarget;
    // Logistic-ish mapping: margin of 0 -> ~50%, +0.5 band -> ~75%, -0.5 band -> ~25%
    readinessProbability = Math.max(0.03, Math.min(0.97, 1 / (1 + Math.exp(-margin * 3))));
    if (readinessProbability >= 0.7) readinessLabel = "On track if current pace continues.";
    else if (readinessProbability >= 0.4) readinessLabel = "Possible, but needs a faster improvement pace or more study time.";
    else readinessLabel = "At current pace, reaching the target by the exam date is unlikely — consider increasing study time or extending the timeline.";
  }

  return {
    currentEstimate,
    componentEstimates,
    target: opts.overallTarget,
    gap,
    trend,
    trendDeltaPerMonth,
    readinessProbability,
    readinessLabel,
  };
}
