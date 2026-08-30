import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { generateWritingTask1, generateWritingTask2 } from "@/lib/ai/prompts/writing";
import { AIUnavailableError } from "@/lib/ai/client";
import { FALLBACK_WRITING_TASK1, FALLBACK_WRITING_TASK2 } from "@/lib/ai/fallback";

const BodySchema = z.object({
  kind: z.enum(["DIAGNOSTIC", "PRACTICE", "WEEKLY_MOCK", "MONTHLY_MOCK"]).default("PRACTICE"),
  mode: z.enum(["EXAM", "STUDY"]).default("EXAM"),
  taskType: z.enum(["TASK1", "TASK2"]),
});

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { kind, mode, taskType } = parsed.data;

  let prompt: unknown;
  try {
    if (taskType === "TASK1") {
      prompt = await generateWritingTask1({ userId: user.id });
    } else {
      const recent = await prisma.writingSubmission.findMany({
        where: { userId: user.id, taskType: "TASK2" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { prompt: true },
      });
      const recentTopics = recent.map((r) => {
        try {
          return (JSON.parse(r.prompt).prompt as string).slice(0, 80);
        } catch {
          return "";
        }
      });
      prompt = await generateWritingTask2(recentTopics, { userId: user.id });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Writing generation failed, using fallback:", err);
    prompt = taskType === "TASK1" ? FALLBACK_WRITING_TASK1 : FALLBACK_WRITING_TASK2;
  }

  const submission = await prisma.writingSubmission.create({
    data: {
      userId: user.id,
      taskType,
      kind,
      mode,
      prompt: JSON.stringify(prompt),
      essayText: "",
      wordCount: 0,
    },
  });

  return NextResponse.json({ attemptId: submission.id });
}
