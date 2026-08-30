import { prisma } from "@/lib/prisma";
import type { SkillKey } from "@/lib/adaptive";
import { getWeightedSkillEstimate } from "@/lib/adaptive";

export interface PeriodReportData {
  periodStart: Date;
  periodEnd: Date;
  studyMinutes: number;
  tasksCompleted: number;
  scoresBySkill: Record<SkillKey | "OVERALL", { start: number | null; end: number | null; delta: number | null }>;
  vocabularyLearned: number;
  errorsCorrected: number; // marked MASTERED in this period
  newErrorsLogged: number;
  improved: string[];
  notImproved: string[];
  biggestProblem: string;
  nextFocus: string;
}

function minutesFromSeconds(totalSec: number): number {
  return Math.round(totalSec / 60);
}

/** Deterministic aggregation for one period (week or month) — no AI involved, so it's free and instant. */
export async function buildPeriodReport(userId: string, periodStart: Date, periodEnd: Date): Promise<PeriodReportData> {
  const [readingAttempts, listeningAttempts, writingSubs, speakingSessions, vocab, masteredErrors, newErrors] = await Promise.all([
    prisma.readingAttempt.findMany({ where: { userId, submittedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.listeningAttempt.findMany({ where: { userId, submittedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.writingSubmission.findMany({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd }, overallBand: { not: null } } }),
    prisma.speakingSession.findMany({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd }, overallBand: { not: null } } }),
    prisma.vocabularyEntry.count({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.errorEntry.count({ where: { userId, masteryStatus: "MASTERED", lastSeenAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.errorEntry.count({ where: { userId, firstSeenAt: { gte: periodStart, lt: periodEnd } } }),
  ]);

  const studySeconds =
    readingAttempts.reduce((s, r) => s + (r.timeSpentSec ?? 0), 0) +
    listeningAttempts.reduce((s, r) => s + (r.timeSpentSec ?? 0), 0) +
    writingSubs.reduce((s, r) => s + (r.timeSpentSec ?? 0), 0) +
    speakingSessions.length * 12 * 60; // speaking duration isn't tracked precisely; ~12min/session estimate

  const tasksCompleted = readingAttempts.length + listeningAttempts.length + writingSubs.length + speakingSessions.length;

  const skills: SkillKey[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const scoresBySkill = {} as PeriodReportData["scoresBySkill"];
  for (const skill of [...skills, "OVERALL" as const]) {
    const rows = await prisma.scoreHistory.findMany({
      where: { userId, skill, createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: { createdAt: "asc" },
    });
    const start = rows[0]?.band ?? null;
    const end = rows[rows.length - 1]?.band ?? null;
    scoresBySkill[skill] = { start, end, delta: start != null && end != null ? Math.round((end - start) * 100) / 100 : null };
  }

  const improved: string[] = [];
  const notImproved: string[] = [];
  for (const skill of skills) {
    const d = scoresBySkill[skill].delta;
    if (d == null) continue;
    if (d > 0.05) improved.push(`${skill} (+${d.toFixed(2)})`);
    else if (d < -0.05) notImproved.push(`${skill} (${d.toFixed(2)})`);
  }
  if (masteredErrors > 0) improved.push(`${masteredErrors} recurring mistake(s) corrected`);

  const topWeakness = await prisma.errorEntry.findFirst({
    where: { userId, masteryStatus: { not: "MASTERED" } },
    orderBy: { frequency: "desc" },
  });
  const biggestProblem = topWeakness
    ? `"${topWeakness.category}" in ${topWeakness.skill} — seen ${topWeakness.frequency}x, still active.`
    : tasksCompleted === 0
    ? "No practice logged this period — the biggest problem is consistency, not any specific skill."
    : "No single dominant recurring problem detected yet — keep an eye on the Error Review page as more data comes in.";

  const weightedEstimates = await Promise.all(skills.map((s) => getWeightedSkillEstimate(userId, s)));
  const lowestIdx = weightedEstimates.reduce(
    (best, val, i) => (val !== null && (best.val === null || val < best.val) ? { val, i } : best),
    { val: null as number | null, i: 0 }
  ).i;
  const nextFocus =
    tasksCompleted === 0
      ? "Get back to a consistent daily rhythm — even 20-30 minutes beats a skipped day."
      : `Prioritize ${skills[lowestIdx]} next period — it's currently the lowest-weighted estimate.`;

  return {
    periodStart,
    periodEnd,
    studyMinutes: minutesFromSeconds(studySeconds),
    tasksCompleted,
    scoresBySkill,
    vocabularyLearned: vocab,
    errorsCorrected: masteredErrors,
    newErrorsLogged: newErrors,
    improved,
    notImproved,
    biggestProblem,
    nextFocus,
  };
}

export function getWeekStart(d: Date = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
}

export function getMonthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Returns this week's report. A week still in progress is computed live and NOT
 * cached (so "so far this week" stays accurate as new activity comes in); once the
 * week has actually ended, the result is cached permanently — matching section 73's
 * "recalculate at end of week" model rather than freezing an incomplete week early.
 */
export async function getOrCreateWeeklyReport(userId: string) {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const isPast = weekEnd.getTime() <= Date.now();

  if (isPast) {
    const existing = await prisma.weeklyReport.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
    if (existing) return { record: existing, data: JSON.parse(existing.summary) as PeriodReportData, isFinal: true };
  }

  const data = await buildPeriodReport(userId, weekStart, weekEnd);
  if (!isPast) return { record: null, data, isFinal: false };

  const record = await prisma.weeklyReport.create({ data: { userId, weekStart, summary: JSON.stringify(data) } });
  return { record, data, isFinal: true };
}

export async function getOrCreateMonthlyReport(userId: string) {
  const monthStart = getMonthStart();
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const isPast = monthEnd.getTime() <= Date.now();

  if (isPast) {
    const existing = await prisma.monthlyReport.findUnique({ where: { userId_monthStart: { userId, monthStart } } });
    if (existing) return { record: existing, data: JSON.parse(existing.summary) as PeriodReportData, isFinal: true };
  }

  const data = await buildPeriodReport(userId, monthStart, monthEnd);
  if (!isPast) return { record: null, data, isFinal: false };

  const record = await prisma.monthlyReport.create({ data: { userId, monthStart, summary: JSON.stringify(data) } });
  return { record, data, isFinal: true };
}

export async function getPastWeeklyReports(userId: string, limit = 8) {
  const rows = await prisma.weeklyReport.findMany({ where: { userId }, orderBy: { weekStart: "desc" }, take: limit });
  return rows.map((r) => ({ record: r, data: JSON.parse(r.summary) as PeriodReportData }));
}

export async function getPastMonthlyReports(userId: string, limit = 6) {
  const rows = await prisma.monthlyReport.findMany({ where: { userId }, orderBy: { monthStart: "desc" }, take: limit });
  return rows.map((r) => ({ record: r, data: JSON.parse(r.summary) as PeriodReportData }));
}
