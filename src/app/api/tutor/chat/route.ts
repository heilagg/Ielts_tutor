import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { tutorReply, type TutorContext } from "@/lib/ai/prompts/tutor";
import { AIUnavailableError, isAIConfigured } from "@/lib/ai/client";
import { predictScore } from "@/lib/scoring/predict";
import { getWeaknessSummary, type SkillKey } from "@/lib/adaptive";
import { computeStudyStreak } from "@/lib/streak";

const BodySchema = z.object({ message: z.string().min(1).max(2000) });

export async function GET() {
  const user = await getOrCreateUser();
  const messages = await prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 100 });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { message } = parsed.data;

  await prisma.chatMessage.create({ data: { userId: user.id, role: "user", content: message } });

  const targets: Record<SkillKey, number> = {
    READING: profile.targetReading,
    LISTENING: profile.targetListening,
    WRITING: profile.targetWriting,
    SPEAKING: profile.targetSpeaking,
  };

  const [prediction, weakness, streak, history] = await Promise.all([
    predictScore({ userId: user.id, targets, overallTarget: profile.targetOverall, examDate: profile.examDate }),
    getWeaknessSummary(user.id, targets),
    computeStudyStreak(user.id),
    prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 21 }),
  ]);

  const context: TutorContext = {
    targetOverall: profile.targetOverall,
    examDate: profile.examDate ? profile.examDate.toISOString().slice(0, 10) : null,
    currentEstimate: prediction.currentEstimate || null,
    componentBands: prediction.componentEstimates,
    topErrorCategories: weakness.topErrorCategories,
    recentScoresSummary: `${prediction.trend}${prediction.trendDeltaPerMonth != null ? ` (${prediction.trendDeltaPerMonth > 0 ? "+" : ""}${prediction.trendDeltaPerMonth}/month)` : ""}`,
    studyStreak: streak,
  };

  const conversationHistory = history
    .reverse()
    .slice(0, -1) // exclude the message we just saved (it's passed separately as `message`)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply: string;
  if (!isAIConfigured()) {
    reply =
      "The AI Tutor needs an ANTHROPIC_API_KEY configured to hold a real conversation. In the meantime, here's what your data shows: " +
      `current estimated overall band ${context.currentEstimate ?? "not yet established"}, target ${context.targetOverall}, ` +
      `weakest skill ${weakness.weakestSkill ?? "not yet determined"}, ${context.studyStreak}-day study streak. ` +
      "Set ANTHROPIC_API_KEY in your .env file and restart the server for full tutoring.";
  } else {
    try {
      reply = await tutorReply({ context, history: conversationHistory, message, userId: user.id });
    } catch (err) {
      if (err instanceof Error && err.name === "AiBudgetExceededError") {
        reply = err.message;
      } else {
        if (!(err instanceof AIUnavailableError)) console.error("Tutor chat failed:", err);
        reply = "Sorry — I couldn't reach the AI service just now. Please try again in a moment.";
      }
    }
  }

  await prisma.chatMessage.create({ data: { userId: user.id, role: "assistant", content: reply } });

  return NextResponse.json({ reply });
}
