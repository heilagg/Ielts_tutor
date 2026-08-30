import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { generateReadingTest } from "@/lib/ai/prompts/reading";
import { AIUnavailableError } from "@/lib/ai/client";
import { FALLBACK_READING_TEST } from "@/lib/ai/fallback";
import { getWeaknessSummary } from "@/lib/adaptive";

const BodySchema = z.object({
  kind: z.enum(["DIAGNOSTIC", "PRACTICE", "WEEKLY_MOCK", "MONTHLY_MOCK"]).default("PRACTICE"),
  mode: z.enum(["EXAM", "STUDY"]).default("EXAM"),
  fullLength: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { kind, mode, fullLength } = parsed.data;

  let focusQuestionTypes: string[] | undefined;
  if (kind !== "DIAGNOSTIC") {
    const targets = {
      READING: profile.targetReading,
      LISTENING: profile.targetListening,
      WRITING: profile.targetWriting,
      SPEAKING: profile.targetSpeaking,
    } as const;
    const weakness = await getWeaknessSummary(user.id, targets);
    focusQuestionTypes = weakness.topWeakQuestionTypes.filter((t) => t.skill === "READING").map((t) => t.type);
  }

  let generator: "claude" | "fallback" = "claude";
  let test;
  try {
    test = await generateReadingTest({ targetBand: profile.targetReading, focusQuestionTypes, fullLength, userId: user.id });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) {
      console.error("Reading generation failed, using fallback:", err);
    }
    generator = "fallback";
    test = FALLBACK_READING_TEST;
  }

  const attempt = await prisma.readingAttempt.create({
    data: {
      userId: user.id,
      kind,
      mode,
      sourceLabel: "AI_GENERATED_IELTS_STYLE",
      passages: JSON.stringify({ ...test, generator }),
    },
  });

  return NextResponse.json({ attemptId: attempt.id });
}
