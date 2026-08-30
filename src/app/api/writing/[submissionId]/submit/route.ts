import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { evaluateWriting } from "@/lib/ai/prompts/writing";
import { evaluateWritingHeuristic } from "@/lib/ai/heuristicEval";
import { AIUnavailableError } from "@/lib/ai/client";
import { recordSkillScore, upsertErrorEntry } from "@/lib/scoring/recordResults";
import { markDiagnosticCompleteIfReady } from "@/lib/diagnosticStatus";
import type { WritingTask1, WritingTask2 } from "@/lib/ai/schemas";

const BodySchema = z.object({ essayText: z.string(), wordCount: z.number(), timeSpentSec: z.number() });

export async function POST(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const userId = await getUserId();
  const { submissionId } = await params;
  const submission = await prisma.writingSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.overallBand != null) return NextResponse.json({ error: "Already evaluated" }, { status: 409 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { essayText, wordCount, timeSpentSec } = parsed.data;

  const promptData = JSON.parse(submission.prompt) as WritingTask1 | WritingTask2;
  const promptText = promptData.prompt;

  const previous = await prisma.writingSubmission.findMany({
    where: { userId, taskType: submission.taskType, overallBand: { not: null }, id: { not: submissionId } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const previousEssaysSummary =
    previous.length > 0
      ? `Previous ${submission.taskType} bands (most recent first): ${previous.map((p) => p.overallBand).join(", ")}. Recurring problems noted previously: ${previous
          .flatMap((p) => (p.problems ? (JSON.parse(p.problems) as string[]) : []))
          .slice(0, 6)
          .join("; ") || "none recorded"}.`
      : undefined;

  let evaluation;
  let evaluatedByAI = true;
  try {
    evaluation = await evaluateWriting({
      taskType: submission.taskType as "TASK1" | "TASK2",
      prompt: promptText,
      essayText,
      wordCount,
      previousEssaysSummary,
      userId,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Writing evaluation failed, using heuristic fallback:", err);
    evaluatedByAI = false;
    evaluation = evaluateWritingHeuristic({ taskType: submission.taskType as "TASK1" | "TASK2", essayText, wordCount });
  }

  await prisma.writingSubmission.update({
    where: { id: submissionId },
    data: {
      essayText,
      wordCount,
      timeSpentSec,
      taskAchievement: evaluation.criteria.taskAchievementOrResponse,
      coherenceCohesion: evaluation.criteria.coherenceCohesion,
      lexicalResource: evaluation.criteria.lexicalResource,
      grammaticalRange: evaluation.criteria.grammaticalRange,
      overallBand: evaluation.overallBand,
      strengths: JSON.stringify(evaluation.strengths),
      problems: JSON.stringify(evaluation.problems),
      corrections: JSON.stringify(evaluation.corrections),
    },
  });

  await recordSkillScore({ userId, skill: "WRITING", band: evaluation.overallBand, source: submission.kind, refId: submissionId });

  for (const c of evaluation.corrections.slice(0, 5)) {
    await upsertErrorEntry({
      userId,
      skill: "WRITING",
      category: c.rule,
      original: c.original,
      corrected: c.improved,
      explanation: c.explanation,
    });
  }

  if (submission.kind === "DIAGNOSTIC") await markDiagnosticCompleteIfReady(userId);

  return NextResponse.json({ evaluation, evaluatedByAI });
}
