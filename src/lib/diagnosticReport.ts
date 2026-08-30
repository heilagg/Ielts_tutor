import { prisma } from "@/lib/prisma";
import { overallBandFromComponents, roundToHalfBand } from "@/lib/scoring/band";
import type { SkillKey } from "@/lib/adaptive";

export interface DiagnosticReport {
  bands: Record<SkillKey, number | null>;
  overall: number | null;
  targets: Record<SkillKey, number>;
  overallTarget: number;
  strongestSkill: SkillKey | null;
  weakestSkill: SkillKey | null;
  bottleneck: { skill: SkillKey; gap: number } | null;
  topWeaknesses: string[];
  topStrengths: string[];
  readingProfile: Record<string, number>;
  listeningProfile: Record<string, number>;
  writingProfile: { task1: Record<string, number> | null; task2: Record<string, number> | null };
  speakingProfile: Record<string, number>;
  grammarProfile: Array<{ category: string; frequency: number }>;
  vocabularyProfile: { entriesTracked: number; lexicalBandWriting: number | null; lexicalBandSpeaking: number | null };
  recommendedWeeklyMinutes: number;
}

export async function buildDiagnosticReport(userId: string): Promise<DiagnosticReport> {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });

  const [reading, listening, writingT1, writingT2, speaking] = await Promise.all([
    prisma.readingAttempt.findFirst({ where: { userId, kind: "DIAGNOSTIC" }, orderBy: { submittedAt: "desc" } }),
    prisma.listeningAttempt.findFirst({ where: { userId, kind: "DIAGNOSTIC" }, orderBy: { submittedAt: "desc" } }),
    prisma.writingSubmission.findFirst({ where: { userId, kind: "DIAGNOSTIC", taskType: "TASK1" }, orderBy: { createdAt: "desc" } }),
    prisma.writingSubmission.findFirst({ where: { userId, kind: "DIAGNOSTIC", taskType: "TASK2" }, orderBy: { createdAt: "desc" } }),
    prisma.speakingSession.findFirst({ where: { userId, kind: "DIAGNOSTIC" }, orderBy: { createdAt: "desc" } }),
  ]);

  const writingBand =
    writingT1?.overallBand != null && writingT2?.overallBand != null
      ? roundToHalfBand((writingT1.overallBand + writingT2.overallBand) / 2)
      : null;

  const bands: Record<SkillKey, number | null> = {
    READING: reading?.band ?? null,
    LISTENING: listening?.band ?? null,
    WRITING: writingBand,
    SPEAKING: speaking?.overallBand ?? null,
  };

  const targets: Record<SkillKey, number> = {
    READING: profile.targetReading,
    LISTENING: profile.targetListening,
    WRITING: profile.targetWriting,
    SPEAKING: profile.targetSpeaking,
  };

  const known = (Object.keys(bands) as SkillKey[]).filter((k) => bands[k] !== null);
  const overall =
    known.length === 4
      ? overallBandFromComponents({
          listening: bands.LISTENING!,
          reading: bands.READING!,
          writing: bands.WRITING!,
          speaking: bands.SPEAKING!,
        })
      : null;

  let strongestSkill: SkillKey | null = null;
  let weakestSkill: SkillKey | null = null;
  let bottleneck: { skill: SkillKey; gap: number } | null = null;
  let bestBand = -Infinity;
  let worstBand = Infinity;
  for (const skill of known) {
    const band = bands[skill]!;
    if (band > bestBand) {
      bestBand = band;
      strongestSkill = skill;
    }
    if (band < worstBand) {
      worstBand = band;
      weakestSkill = skill;
    }
    const gap = targets[skill] - band;
    if (!bottleneck || gap > bottleneck.gap) bottleneck = { skill, gap };
  }

  const readingProfile: Record<string, number> = reading?.accuracyByType ? JSON.parse(reading.accuracyByType) : {};
  const listeningProfile: Record<string, number> = listening?.accuracyByType ? JSON.parse(listening.accuracyByType) : {};

  const writingProfile = {
    task1: writingT1
      ? {
          "Task Achievement": writingT1.taskAchievement ?? 0,
          "Coherence & Cohesion": writingT1.coherenceCohesion ?? 0,
          "Lexical Resource": writingT1.lexicalResource ?? 0,
          "Grammatical Range": writingT1.grammaticalRange ?? 0,
        }
      : null,
    task2: writingT2
      ? {
          "Task Response": writingT2.taskAchievement ?? 0,
          "Coherence & Cohesion": writingT2.coherenceCohesion ?? 0,
          "Lexical Resource": writingT2.lexicalResource ?? 0,
          "Grammatical Range": writingT2.grammaticalRange ?? 0,
        }
      : null,
  };

  const speakingProfile: Record<string, number> = speaking
    ? {
        "Fluency & Coherence": speaking.fluencyCoherence ?? 0,
        "Lexical Resource": speaking.lexicalResource ?? 0,
        "Grammatical Range": speaking.grammaticalRange ?? 0,
        Pronunciation: speaking.pronunciation ?? 0,
      }
    : {};

  const weaknesses: string[] = [];
  const strengths: string[] = [];

  for (const [type, acc] of Object.entries(readingProfile)) {
    if (acc < 0.6) weaknesses.push(`Reading: ${type} (${Math.round(acc * 100)}% accuracy)`);
    else if (acc >= 0.85) strengths.push(`Reading: strong on ${type}`);
  }
  for (const [type, acc] of Object.entries(listeningProfile)) {
    if (acc < 0.6) weaknesses.push(`Listening: ${type} (${Math.round(acc * 100)}% accuracy)`);
    else if (acc >= 0.85) strengths.push(`Listening: strong on ${type}`);
  }
  if (writingT1?.problems) weaknesses.push(...(JSON.parse(writingT1.problems) as string[]).slice(0, 2).map((p) => `Writing Task 1: ${p}`));
  if (writingT2?.problems) weaknesses.push(...(JSON.parse(writingT2.problems) as string[]).slice(0, 2).map((p) => `Writing Task 2: ${p}`));
  if (writingT2?.strengths) strengths.push(...(JSON.parse(writingT2.strengths) as string[]).slice(0, 2).map((s) => `Writing: ${s}`));
  if (speaking?.feedback) {
    const fb = JSON.parse(speaking.feedback) as { strengths: string[]; problems: string[] };
    weaknesses.push(...fb.problems.slice(0, 2).map((p) => `Speaking: ${p}`));
    strengths.push(...fb.strengths.slice(0, 2).map((s) => `Speaking: ${s}`));
  }

  const grammarEntries = await prisma.errorEntry.groupBy({
    by: ["category"],
    where: { userId },
    _sum: { frequency: true },
    orderBy: { _sum: { frequency: "desc" } },
    take: 8,
  });
  const grammarProfile = grammarEntries.map((e) => ({ category: e.category, frequency: e._sum.frequency ?? 0 }));

  const vocabularyCount = await prisma.vocabularyEntry.count({ where: { userId } });

  const studyDays = JSON.parse(profile.studyDays) as number[];
  const recommendedWeeklyMinutes = profile.minutesPerDay * Math.max(studyDays.length, 1);

  return {
    bands,
    overall,
    targets,
    overallTarget: profile.targetOverall,
    strongestSkill,
    weakestSkill,
    bottleneck,
    topWeaknesses: weaknesses.slice(0, 5),
    topStrengths: strengths.slice(0, 5),
    readingProfile,
    listeningProfile,
    writingProfile,
    speakingProfile,
    grammarProfile,
    vocabularyProfile: {
      entriesTracked: vocabularyCount,
      lexicalBandWriting: writingT2?.lexicalResource ?? writingT1?.lexicalResource ?? null,
      lexicalBandSpeaking: speaking?.lexicalResource ?? null,
    },
    recommendedWeeklyMinutes,
  };
}
