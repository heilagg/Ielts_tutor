import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { buildWhyNotYetAnalysis } from "@/lib/whyNotYet";
import { generateWhyNotYetNarrative } from "@/lib/ai/prompts/coaching";
import { AIUnavailableError } from "@/lib/ai/client";
import type { SkillKey } from "@/lib/adaptive";

export async function POST() {
  const userId = await getUserId();
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const targets: Record<SkillKey, number> = {
    READING: profile.targetReading,
    LISTENING: profile.targetListening,
    WRITING: profile.targetWriting,
    SPEAKING: profile.targetSpeaking,
  };
  const analysis = await buildWhyNotYetAnalysis(userId, targets, profile.targetOverall, profile.examDate);

  const summary = `Current estimated overall band: ${analysis.prediction.currentEstimate}. Target: ${analysis.prediction.target}. Gap: ${analysis.prediction.gap}.
Skills already at/above target: ${analysis.sufficientSkills.join(", ") || "none yet"}.
Skills below target: ${analysis.belowTargetSkills.map((s) => `${s.skill} (band ${s.band}, target ${s.target}, gap ${s.gap})`).join("; ") || "none"}.
Biggest blockers: ${analysis.biggestBlockers.join(" | ")}.
Recommended next steps: ${analysis.nextSteps.join(" | ")}.
Pace note: ${analysis.paceNote}`;

  try {
    const narrative = await generateWhyNotYetNarrative({ analysisSummary: summary, userId });
    return NextResponse.json({ narrative });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Why-not-yet narrative failed:", err);
    return NextResponse.json({ error: "AI narrative unavailable right now — the analysis above still applies." }, { status: 503 });
  }
}
