import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { stripListeningAnswers } from "@/lib/testSanitize";
import { ListeningTestRunner } from "@/components/listening/ListeningTestRunner";
import { ListeningResults } from "@/components/listening/ListeningResults";
import type { ListeningTest } from "@/lib/ai/schemas";

export default async function ListeningTestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const userId = await getUserId();
  const { attemptId } = await params;
  const attempt = await prisma.listeningAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) notFound();

  const stored = JSON.parse(attempt.sections) as ListeningTest & { generator: string };

  if (attempt.submittedAt) {
    const answers = attempt.answers ? (JSON.parse(attempt.answers) as Record<number, string>) : {};
    return (
      <ListeningResults
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

  return <ListeningTestRunner attemptId={attemptId} test={stripListeningAnswers(stored)} mode={attempt.mode} />;
}
