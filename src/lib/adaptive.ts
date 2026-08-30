import { prisma } from "@/lib/prisma";

export type SkillKey = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

export interface WeaknessSummary {
  skillBands: Record<SkillKey, number | null>;
  weakestSkill: SkillKey | null;
  bottleneckGap: { skill: SkillKey; gap: number } | null;
  topErrorCategories: Array<{ skill: string; category: string; frequency: number }>;
  topWeakQuestionTypes: Array<{ skill: SkillKey; type: string; accuracy: number }>;
}

/** Most recent band per skill, using latest ScoreHistory row for that skill. */
export async function getLatestSkillBands(userId: string): Promise<Record<SkillKey, number | null>> {
  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const result = {} as Record<SkillKey, number | null>;
  for (const skill of skills) {
    const latest = await prisma.scoreHistory.findFirst({
      where: { userId, skill },
      orderBy: { createdAt: "desc" },
    });
    result[skill] = latest?.band ?? null;
  }
  return result;
}

/** Recency-weighted rolling average per skill (recent attempts count more). */
export async function getWeightedSkillEstimate(userId: string, skill: SkillKey): Promise<number | null> {
  const history = await prisma.scoreHistory.findMany({
    where: { userId, skill },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  if (history.length === 0) return null;
  let weightedSum = 0;
  let weightTotal = 0;
  history.forEach((entry, idx) => {
    const weight = Math.pow(0.75, idx); // most recent = weight 1, decaying by 25% per step back
    weightedSum += entry.band * weight;
    weightTotal += weight;
  });
  return Math.round((weightedSum / weightTotal) * 2) / 2;
}

export async function getWeaknessSummary(userId: string, targets: Record<SkillKey, number>): Promise<WeaknessSummary> {
  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const skillBands: Record<SkillKey, number | null> = {} as Record<SkillKey, number | null>;
  for (const skill of skills) {
    skillBands[skill] = await getWeightedSkillEstimate(userId, skill);
  }

  let bottleneck: { skill: SkillKey; gap: number } | null = null;
  let weakestSkill: SkillKey | null = null;
  let weakestBand = Infinity;
  for (const skill of skills) {
    const band = skillBands[skill];
    if (band === null) continue;
    if (band < weakestBand) {
      weakestBand = band;
      weakestSkill = skill;
    }
    const gap = targets[skill] - band;
    if (!bottleneck || gap > bottleneck.gap) bottleneck = { skill, gap };
  }

  const errors = await prisma.errorEntry.groupBy({
    by: ["skill", "category"],
    where: { userId, masteryStatus: { not: "MASTERED" } },
    _sum: { frequency: true },
    orderBy: { _sum: { frequency: "desc" } },
    take: 8,
  });
  const topErrorCategories = errors.map((e) => ({
    skill: e.skill,
    category: e.category,
    frequency: e._sum.frequency ?? 0,
  }));

  // Question-type accuracy pulled from stored accuracyByType JSON on the most recent attempts.
  const topWeakQuestionTypes: Array<{ skill: SkillKey; type: string; accuracy: number }> = [];
  const latestReading = await prisma.readingAttempt.findFirst({
    where: { userId, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });
  if (latestReading?.accuracyByType) {
    const parsed = JSON.parse(latestReading.accuracyByType) as Record<string, number>;
    Object.entries(parsed)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .forEach(([type, accuracy]) => topWeakQuestionTypes.push({ skill: "READING", type, accuracy }));
  }
  const latestListening = await prisma.listeningAttempt.findFirst({
    where: { userId, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });
  if (latestListening?.accuracyByType) {
    const parsed = JSON.parse(latestListening.accuracyByType) as Record<string, number>;
    Object.entries(parsed)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .forEach(([type, accuracy]) => topWeakQuestionTypes.push({ skill: "LISTENING", type, accuracy }));
  }

  return {
    skillBands,
    weakestSkill,
    bottleneckGap: bottleneck,
    topErrorCategories,
    topWeakQuestionTypes,
  };
}

export interface PlannedTaskSpec {
  skill: SkillKey | "VOCAB" | "GRAMMAR";
  subskill?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  title: string;
  purpose: string;
  estMinutes: number;
}

/**
 * Decides which task types to schedule today given the student's weaknesses, exam
 * proximity, and daily time budget. Deterministic and explainable by design — every
 * planned task carries a `purpose` string so the student always knows why it's there.
 */
export function planTodaysTasks(opts: {
  minutesPerDay: number;
  weakness: WeaknessSummary;
  examDate: Date | null;
  dayIndex: number; // days since profile created, used to rotate skill focus
}): PlannedTaskSpec[] {
  const { minutesPerDay, weakness, examDate, dayIndex } = opts;
  const daysToExam = examDate ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86_400_000)) : null;
  const inFinalPhase = daysToExam !== null && daysToExam <= 30;
  const inMockPhase = daysToExam !== null && daysToExam <= 60;

  const tasks: PlannedTaskSpec[] = [];
  let budget = minutesPerDay;

  const weakest = weakness.weakestSkill;
  const rotation: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  // Rotate the "secondary" skill day by day so all four get covered over a week,
  // while the weakest skill (if any) always gets a slot.
  const secondary = rotation[dayIndex % rotation.length];

  const skillsToday = new Set<SkillKey>();
  if (weakest) skillsToday.add(weakest);
  skillsToday.add(secondary);
  if (skillsToday.size < 2) skillsToday.add(rotation[(dayIndex + 1) % rotation.length]);

  for (const skill of skillsToday) {
    if (budget < 15) break;
    const weakType = weakness.topWeakQuestionTypes.find((t) => t.skill === skill);
    const errorFocus = weakness.topErrorCategories.find((e) => e.skill === skill);

    if (skill === "READING") {
      const minutes = inFinalPhase ? 60 : 25;
      tasks.push({
        skill: "READING",
        subskill: weakType?.type,
        difficulty: weakness.skillBands.READING && weakness.skillBands.READING >= 7 ? "HARD" : "MEDIUM",
        title: inMockPhase ? "Timed Reading practice (full passage)" : "Reading practice set",
        purpose: weakType
          ? `Your accuracy on "${weakType.type}" questions was ${Math.round(weakType.accuracy * 100)}% on your last test — today's set is weighted toward that question type.`
          : weakest === "READING"
          ? "Reading is currently your lowest estimated band, so it gets priority today."
          : "Scheduled reading practice to keep this skill's rotation on track.",
        estMinutes: minutes,
      });
      budget -= minutes;
    } else if (skill === "LISTENING") {
      const minutes = inFinalPhase ? 40 : 25;
      tasks.push({
        skill: "LISTENING",
        subskill: weakType?.type,
        difficulty: weakness.skillBands.LISTENING && weakness.skillBands.LISTENING >= 7 ? "HARD" : "MEDIUM",
        title: inMockPhase ? "Timed Listening practice (full section)" : "Listening practice set",
        purpose: weakType
          ? `You've been losing marks on "${weakType.type}" listening questions — this set targets that.`
          : weakest === "LISTENING"
          ? "Listening is currently your lowest estimated band, so it gets priority today."
          : "Scheduled listening practice to keep this skill's rotation on track.",
        estMinutes: minutes,
      });
      budget -= minutes;
    } else if (skill === "WRITING") {
      const minutes = 40;
      tasks.push({
        skill: "WRITING",
        subskill: errorFocus?.category,
        difficulty: "MEDIUM",
        title: dayIndex % 2 === 0 ? "Writing Task 2 essay" : "Writing Task 1 report",
        purpose: errorFocus
          ? `"${errorFocus.category}" has come up ${errorFocus.frequency}+ times in your past essays — today's task is a chance to apply the correction.`
          : weakest === "WRITING"
          ? "Writing is currently your lowest estimated band, so it gets priority today."
          : "Scheduled writing practice to build volume ahead of your next mock.",
        estMinutes: minutes,
      });
      budget -= minutes;
    } else if (skill === "SPEAKING") {
      const minutes = 20;
      tasks.push({
        skill: "SPEAKING",
        subskill: errorFocus?.category,
        difficulty: "MEDIUM",
        title: "Speaking practice (Part 1-3)",
        purpose: weakest === "SPEAKING"
          ? "Speaking is currently your lowest estimated band, so it gets priority today."
          : "Regular speaking practice to build fluency and reduce hesitation under time pressure.",
        estMinutes: minutes,
      });
      budget -= minutes;
    }
  }

  if (budget >= 10 && weakness.topErrorCategories.length > 0) {
    tasks.push({
      skill: "GRAMMAR",
      subskill: weakness.topErrorCategories[0].category,
      difficulty: "MEDIUM",
      title: `Error review: ${weakness.topErrorCategories[0].category}`,
      purpose: `This is your most frequent recurring error category (${weakness.topErrorCategories[0].frequency} occurrences). Reviewing it now interrupts the pattern before your next mock.`,
      estMinutes: 10,
    });
  }

  return tasks;
}
