import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { WritingResults } from "@/components/writing/WritingResults";
import type { WritingTask1, WritingTask2 } from "@/lib/ai/schemas";

export default async function WritingTestPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const userId = await getUserId();
  const { submissionId } = await params;
  const submission = await prisma.writingSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.userId !== userId) notFound();

  const prompt = JSON.parse(submission.prompt) as WritingTask1 | WritingTask2;

  if (submission.overallBand != null) {
    return (
      <WritingResults
        data={{
          taskType: submission.taskType as "TASK1" | "TASK2",
          essayText: submission.essayText,
          wordCount: submission.wordCount,
          taskAchievement: submission.taskAchievement ?? 0,
          coherenceCohesion: submission.coherenceCohesion ?? 0,
          lexicalResource: submission.lexicalResource ?? 0,
          grammaticalRange: submission.grammaticalRange ?? 0,
          overallBand: submission.overallBand,
          strengths: submission.strengths ? JSON.parse(submission.strengths) : [],
          problems: submission.problems ? JSON.parse(submission.problems) : [],
          corrections: submission.corrections ? JSON.parse(submission.corrections) : [],
          returnTo: submission.kind === "DIAGNOSTIC" ? "/diagnostic" : "/practice",
        }}
      />
    );
  }

  return (
    <WritingEditor
      submissionId={submissionId}
      taskType={submission.taskType as "TASK1" | "TASK2"}
      prompt={prompt}
      mode={submission.mode}
      initialText={submission.essayText}
    />
  );
}
