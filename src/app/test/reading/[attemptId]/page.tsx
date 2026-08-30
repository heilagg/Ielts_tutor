import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { stripReadingAnswers } from "@/lib/testSanitize";
import { ReadingTestRunner } from "@/components/reading/ReadingTestRunner";
import { ReadingResults } from "@/components/reading/ReadingResults";
import type { ReadingTest } from "@/lib/ai/schemas";

export default async function ReadingTestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const userId = await getUserId();
  const { attemptId } = await params;
  const attempt = await prisma.readingAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) notFound();

  const stored = JSON.parse(attempt.passages) as ReadingTest & { generator: string };

  if (attempt.submittedAt) {
    const answers = attempt.answers ? (JSON.parse(attempt.answers) as Record<number, string>) : {};
    return (
      <ReadingResults
        test={stored}
        answers={answers}
        rawScore={attempt.rawScore ?? 0}
        band={attempt.band ?? 0}
        accuracyByType={attempt.accuracyByType ? JSON.parse(attempt.accuracyByType) : {}}
        unanswered={attempt.unanswered ?? 0}
        timeSpentSec={attempt.timeSpentSec ?? 0}
        returnTo={attempt.kind === "DIAGNOSTIC" ? "/diagnostic" : "/practice"}
      />
    );
  }

  const timeLimitMinutes = Math.max(20, Math.round((60 * stored.questions.length) / 40));

  return (
    <ReadingTestRunner
      attemptId={attemptId}
      test={stripReadingAnswers(stored)}
      timeLimitMinutes={timeLimitMinutes}
      mode={attempt.mode}
    />
  );
}
