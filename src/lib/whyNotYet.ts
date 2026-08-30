import { predictScore, type ScorePrediction } from "@/lib/scoring/predict";
import { getWeaknessSummary, type SkillKey } from "@/lib/adaptive";
import { prisma } from "@/lib/prisma";

export interface WhyNotYetAnalysis {
  prediction: ScorePrediction;
  sufficientSkills: SkillKey[];
  belowTargetSkills: Array<{ skill: SkillKey; band: number; target: number; gap: number }>;
  biggestBlockers: string[];
  nextSteps: string[];
  monthsAtCurrentPace: number | null;
  paceNote: string;
}

const SKILL_LABEL: Record<SkillKey, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

/**
 * Section 55: "WHY AM I NOT 7.5 YET?" — a single deterministic analysis combining the
 * score prediction model, per-skill gaps, and the error/question-type weakness data
 * already tracked elsewhere in the app. Kept dependency-free of the AI call so it's
 * instant and free; an optional AI narrative can be layered on top (see the API route).
 */
export async function buildWhyNotYetAnalysis(userId: string, targets: Record<SkillKey, number>, overallTarget: number, examDate: Date | null): Promise<WhyNotYetAnalysis> {
  const [prediction, weakness] = await Promise.all([
    predictScore({ userId, targets, overallTarget, examDate }),
    getWeaknessSummary(userId, targets),
  ]);

  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const sufficientSkills: SkillKey[] = [];
  const belowTargetSkills: WhyNotYetAnalysis["belowTargetSkills"] = [];

  for (const skill of skills) {
    const band = prediction.componentEstimates[skill];
    if (band === null) continue;
    if (band >= targets[skill]) sufficientSkills.push(skill);
    else belowTargetSkills.push({ skill, band, target: targets[skill], gap: Math.round((targets[skill] - band) * 100) / 100 });
  }
  belowTargetSkills.sort((a, b) => b.gap - a.gap);

  const biggestBlockers: string[] = [];
  if (weakness.topErrorCategories[0]) {
    biggestBlockers.push(
      `Recurring "${weakness.topErrorCategories[0].category}" mistakes in ${weakness.topErrorCategories[0].skill} (${weakness.topErrorCategories[0].frequency}+ occurrences).`
    );
  }
  if (weakness.topWeakQuestionTypes[0]) {
    biggestBlockers.push(
      `${SKILL_LABEL[weakness.topWeakQuestionTypes[0].skill]} accuracy on "${weakness.topWeakQuestionTypes[0].type}" questions is only ${Math.round(weakness.topWeakQuestionTypes[0].accuracy * 100)}%.`
    );
  }
  if (belowTargetSkills[0]) {
    biggestBlockers.push(
      `${SKILL_LABEL[belowTargetSkills[0].skill]} is ${belowTargetSkills[0].gap.toFixed(1)} bands below its ${belowTargetSkills[0].target.toFixed(1)} target — currently the single biggest contributor to the overall gap.`
    );
  }
  if (biggestBlockers.length === 0) {
    biggestBlockers.push("Not enough diagnostic/practice data yet to identify a specific blocker — complete more practice sessions.");
  }

  const nextSteps: string[] = [];
  if (belowTargetSkills[0]) {
    nextSteps.push(`Prioritize ${SKILL_LABEL[belowTargetSkills[0].skill]} — it has the largest gap to target.`);
  }
  if (weakness.topErrorCategories[0]) {
    nextSteps.push(`Drill "${weakness.topErrorCategories[0].category}" specifically until it stops recurring (see Error Review → Flashcards).`);
  }
  if (weakness.topWeakQuestionTypes[0]) {
    nextSteps.push(`Practice targeted drills for "${weakness.topWeakQuestionTypes[0].type}" until accuracy is consistently above 80%.`);
  }
  const dueMock = await prisma.mockExam.findFirst({ where: { userId }, orderBy: { startedAt: "desc" } });
  if (!dueMock) nextSteps.push("Complete your first weekly mock to establish a real trend line — right now the estimate is based on limited data.");
  if (nextSteps.length === 0) nextSteps.push("Keep up consistent practice across all four skills and retake a full mock to confirm progress.");

  let monthsAtCurrentPace: number | null = null;
  let paceNote: string;
  if (prediction.gap <= 0) {
    paceNote = "Your current estimate already meets or exceeds your target on a recency-weighted basis — focus now shifts to consistency under exam conditions.";
  } else if (prediction.trend === "improving" && prediction.trendDeltaPerMonth && prediction.trendDeltaPerMonth > 0) {
    monthsAtCurrentPace = Math.round((prediction.gap / prediction.trendDeltaPerMonth) * 10) / 10;
    paceNote = `At your current improvement pace (${prediction.trendDeltaPerMonth > 0 ? "+" : ""}${prediction.trendDeltaPerMonth.toFixed(2)} bands/month), closing the remaining ${prediction.gap.toFixed(1)}-band gap would take roughly ${monthsAtCurrentPace} more month(s) — treat this as a rough extrapolation, not a guarantee.`;
  } else if (prediction.trend === "flat") {
    paceNote = "Your score has been flat recently — at this pace the gap won't close on its own. Consider increasing study time, changing what you practice, or specifically targeting the blockers above.";
  } else if (prediction.trend === "declining") {
    paceNote = "Your recent trend is declining, not improving — investigate whether study consistency has dropped or whether a specific skill has regressed before estimating a timeline.";
  } else {
    paceNote = "Not enough score history yet to estimate a pace — this becomes more reliable after a few more practice sessions and your first mock.";
  }

  return { prediction, sufficientSkills, belowTargetSkills, biggestBlockers, nextSteps, monthsAtCurrentPace, paceNote };
}
