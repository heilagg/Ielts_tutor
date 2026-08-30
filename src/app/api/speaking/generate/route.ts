import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { generateSpeakingQuestions } from "@/lib/ai/prompts/speaking";
import { AIUnavailableError } from "@/lib/ai/client";
import { FALLBACK_SPEAKING_QUESTIONS } from "@/lib/ai/fallback";

const BodySchema = z.object({
  kind: z.enum(["DIAGNOSTIC", "PRACTICE", "WEEKLY_MOCK", "MONTHLY_MOCK"]).default("PRACTICE"),
  mode: z.enum(["EXAM", "STUDY"]).default("EXAM"),
});

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { kind, mode } = parsed.data;

  const recent = await prisma.speakingSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { parts: true },
  });
  const recentTopics = recent.map((r) => {
    try {
      return JSON.parse(r.parts).questions?.part1?.topic ?? "";
    } catch {
      return "";
    }
  });

  let questions;
  try {
    questions = await generateSpeakingQuestions(recentTopics.filter(Boolean), { userId: user.id });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Speaking generation failed, using fallback:", err);
    questions = FALLBACK_SPEAKING_QUESTIONS;
  }

  const session = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      kind,
      mode,
      parts: JSON.stringify({ questions }),
    },
  });

  return NextResponse.json({ attemptId: session.id, questions });
}
