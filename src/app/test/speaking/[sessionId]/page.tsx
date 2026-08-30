import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { SpeakingRunner } from "@/components/speaking/SpeakingRunner";
import { SpeakingResults } from "@/components/speaking/SpeakingResults";
import type { SpeakingQuestionSet } from "@/lib/ai/schemas";

export default async function SpeakingTestPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const userId = await getUserId();
  const { sessionId } = await params;
  const session = await prisma.speakingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) notFound();

  const stored = JSON.parse(session.parts) as { questions: SpeakingQuestionSet };

  if (session.overallBand != null) {
    const feedback = session.feedback
      ? (JSON.parse(session.feedback) as {
          strengths: string[];
          problems: string[];
          corrections: SpeakingResultsPropsCorrections;
          pronunciationNotes: string[];
        })
      : { strengths: [], problems: [], corrections: [], pronunciationNotes: [] };
    const metrics = session.metrics
      ? JSON.parse(session.metrics)
      : { wordsPerMinute: 0, fillerCount: 0, longPauseCount: 0, selfCorrections: 0 };

    return (
      <SpeakingResults
        data={{
          fluencyCoherence: session.fluencyCoherence ?? 0,
          lexicalResource: session.lexicalResource ?? 0,
          grammaticalRange: session.grammaticalRange ?? 0,
          pronunciation: session.pronunciation ?? 0,
          overallBand: session.overallBand,
          strengths: feedback.strengths,
          problems: feedback.problems,
          corrections: feedback.corrections,
          pronunciationNotes: feedback.pronunciationNotes,
          metrics,
          returnTo: session.kind === "DIAGNOSTIC" ? "/diagnostic" : "/practice",
        }}
      />
    );
  }

  return <SpeakingRunner sessionId={sessionId} questions={stored.questions} mode={session.mode} />;
}

type SpeakingResultsPropsCorrections = Array<{ original: string; problem: string; explanation: string; improved: string; rule: string }>;
