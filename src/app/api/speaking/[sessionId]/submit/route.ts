import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { evaluateSpeaking } from "@/lib/ai/prompts/speaking";
import { evaluateSpeakingHeuristic } from "@/lib/ai/heuristicEval";
import { AIUnavailableError } from "@/lib/ai/client";
import { recordSkillScore, upsertErrorEntry } from "@/lib/scoring/recordResults";
import { markDiagnosticCompleteIfReady } from "@/lib/diagnosticStatus";
import type { SpeakingQuestionSet } from "@/lib/ai/schemas";

const BodySchema = z.object({
  part1Transcript: z.array(z.object({ question: z.string(), answer: z.string() })),
  part2Transcript: z.object({ prompt: z.string(), answer: z.string() }),
  part3Transcript: z.array(z.object({ question: z.string(), answer: z.string() })),
  speechMetrics: z.object({
    wordsPerMinute: z.number(),
    fillerCount: z.number(),
    longPauseCount: z.number(),
    selfCorrections: z.number(),
  }),
});

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const userId = await getUserId();
  const { sessionId } = await params;
  const session = await prisma.speakingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.overallBand != null) return NextResponse.json({ error: "Already evaluated" }, { status: 409 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const stored = JSON.parse(session.parts) as { questions: SpeakingQuestionSet };
  const fullTranscript = [
    ...body.part1Transcript.map((t) => t.answer),
    body.part2Transcript.answer,
    ...body.part3Transcript.map((t) => t.answer),
  ].join(" ");

  let evaluation;
  let evaluatedByAI = true;
  try {
    evaluation = await evaluateSpeaking({
      part1Transcript: body.part1Transcript,
      part2Transcript: body.part2Transcript,
      part3Transcript: body.part3Transcript,
      speechMetrics: body.speechMetrics,
      userId,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Speaking evaluation failed, using heuristic fallback:", err);
    evaluatedByAI = false;
    evaluation = evaluateSpeakingHeuristic({ fullTranscript, speechMetrics: body.speechMetrics });
  }

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      parts: JSON.stringify({
        questions: stored.questions,
        transcript: { part1: body.part1Transcript, part2: body.part2Transcript, part3: body.part3Transcript },
      }),
      fluencyCoherence: evaluation.criteria.fluencyCoherence,
      lexicalResource: evaluation.criteria.lexicalResource,
      grammaticalRange: evaluation.criteria.grammaticalRange,
      pronunciation: evaluation.criteria.pronunciation,
      overallBand: evaluation.overallBand,
      feedback: JSON.stringify({ strengths: evaluation.strengths, problems: evaluation.problems, corrections: evaluation.corrections, pronunciationNotes: evaluation.pronunciationNotes }),
      metrics: JSON.stringify(body.speechMetrics),
    },
  });

  await recordSkillScore({ userId, skill: "SPEAKING", band: evaluation.overallBand, source: session.kind, refId: sessionId });

  for (const c of evaluation.corrections.slice(0, 5)) {
    await upsertErrorEntry({
      userId,
      skill: "SPEAKING",
      category: c.rule,
      original: c.original,
      corrected: c.improved,
      explanation: c.explanation,
    });
  }

  if (session.kind === "DIAGNOSTIC") await markDiagnosticCompleteIfReady(userId);

  return NextResponse.json({ evaluation, evaluatedByAI });
}
