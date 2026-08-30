import { prisma } from "@/lib/prisma";

export interface DiagnosticStatus {
  reading: { done: boolean; band: number | null };
  listening: { done: boolean; band: number | null };
  writingTask1: { done: boolean; band: number | null };
  writingTask2: { done: boolean; band: number | null };
  speaking: { done: boolean; band: number | null };
  allComplete: boolean;
}

export async function getDiagnosticStatus(userId: string): Promise<DiagnosticStatus> {
  const [reading, listening, writingT1, writingT2, speaking] = await Promise.all([
    prisma.readingAttempt.findFirst({ where: { userId, kind: "DIAGNOSTIC", submittedAt: { not: null } }, orderBy: { submittedAt: "desc" } }),
    prisma.listeningAttempt.findFirst({ where: { userId, kind: "DIAGNOSTIC", submittedAt: { not: null } }, orderBy: { submittedAt: "desc" } }),
    prisma.writingSubmission.findFirst({ where: { userId, kind: "DIAGNOSTIC", taskType: "TASK1", overallBand: { not: null } }, orderBy: { createdAt: "desc" } }),
    prisma.writingSubmission.findFirst({ where: { userId, kind: "DIAGNOSTIC", taskType: "TASK2", overallBand: { not: null } }, orderBy: { createdAt: "desc" } }),
    prisma.speakingSession.findFirst({ where: { userId, kind: "DIAGNOSTIC", overallBand: { not: null } }, orderBy: { createdAt: "desc" } }),
  ]);

  const status: DiagnosticStatus = {
    reading: { done: Boolean(reading), band: reading?.band ?? null },
    listening: { done: Boolean(listening), band: listening?.band ?? null },
    writingTask1: { done: Boolean(writingT1), band: writingT1?.overallBand ?? null },
    writingTask2: { done: Boolean(writingT2), band: writingT2?.overallBand ?? null },
    speaking: { done: Boolean(speaking), band: speaking?.overallBand ?? null },
    allComplete: false,
  };
  status.allComplete =
    status.reading.done && status.listening.done && status.writingTask1.done && status.writingTask2.done && status.speaking.done;
  return status;
}

/** Called at the end of every diagnostic submit route. Flips Profile.diagnosticComplete once all 4 skills are in. */
export async function markDiagnosticCompleteIfReady(userId: string): Promise<boolean> {
  const status = await getDiagnosticStatus(userId);
  if (status.allComplete) {
    await prisma.profile.update({ where: { userId }, data: { diagnosticComplete: true } });
  }
  return status.allComplete;
}
