import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { gradeQuestions } from "@/lib/scoring/gradeReadingListening";
import { listeningRawToBand } from "@/lib/scoring/band";
import { recordSkillScore, upsertErrorEntry } from "@/lib/scoring/recordResults";
import { markDiagnosticCompleteIfReady } from "@/lib/diagnosticStatus";
import type { ListeningTest } from "@/lib/ai/schemas";

const BodySchema = z.object({
  answers: z.record(z.string(), z.string()),
  timeSpentSec: z.number(),
});

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const userId = await getUserId();
  const { attemptId } = await params;
  const attempt = await prisma.listeningAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.submittedAt) return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const stored = JSON.parse(attempt.sections) as ListeningTest & { generator: string };
  const answersByNumber: Record<number, string> = {};
  for (const [k, v] of Object.entries(parsed.data.answers)) answersByNumber[Number(k)] = v;

  const result = gradeQuestions(stored.questions, answersByNumber);
  const band = listeningRawToBand(result.rawScore, result.total);

  await prisma.listeningAttempt.update({
    where: { id: attemptId },
    data: {
      answers: JSON.stringify(answersByNumber),
      rawScore: result.rawScore,
      band,
      accuracyByType: JSON.stringify(result.accuracyByType),
      unanswered: result.unanswered,
      timeSpentSec: parsed.data.timeSpentSec,
      submittedAt: new Date(),
    },
  });

  await recordSkillScore({ userId, skill: "LISTENING", band, source: attempt.kind, refId: attemptId });

  for (const [type, accuracy] of Object.entries(result.accuracyByType)) {
    if (accuracy < 0.6) {
      await upsertErrorEntry({
        userId,
        skill: "LISTENING",
        category: type,
        original: `Missed questions in the "${type}" group`,
        corrected: "Review the strategy for this question type",
        explanation: `Accuracy on "${type}" questions was ${Math.round(accuracy * 100)}% on this attempt.`,
        severity: accuracy < 0.4 ? "HIGH" : "MEDIUM",
      });
    }
  }

  if (attempt.kind === "DIAGNOSTIC") await markDiagnosticCompleteIfReady(userId);

  return NextResponse.json({
    rawScore: result.rawScore,
    total: result.total,
    band,
    accuracyByType: result.accuracyByType,
    unanswered: result.unanswered,
  });
}
