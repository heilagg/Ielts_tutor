import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";

const OnboardingSchema = z.object({
  examType: z.enum(["ACADEMIC", "GENERAL_TRAINING"]),
  targetOverall: z.number().min(4).max(9),
  examDate: z.string().nullable(),
  selfEstimatedLevel: z.string().nullable(),
  minutesPerDay: z.number().min(15).max(300),
  studyDays: z.array(z.number().min(0).max(6)),
  planMonths: z.number().min(1).max(24),
});

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json();
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Component targets: default recommended split around the overall target, per spec.
  const targetWriting = Math.min(d.targetOverall, 7.0);
  const targetSpeaking = Math.min(d.targetOverall, 7.0);
  const targetReading = d.targetOverall;
  const targetListening = d.targetOverall;

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      examType: d.examType,
      targetOverall: d.targetOverall,
      targetListening,
      targetReading,
      targetWriting,
      targetSpeaking,
      examDate: d.examDate ? new Date(d.examDate) : null,
      selfEstimatedLevel: d.selfEstimatedLevel,
      minutesPerDay: d.minutesPerDay,
      studyDays: JSON.stringify(d.studyDays),
      planMonths: d.planMonths,
      onboardingComplete: true,
    },
    create: {
      userId: user.id,
      examType: d.examType,
      targetOverall: d.targetOverall,
      targetListening,
      targetReading,
      targetWriting,
      targetSpeaking,
      examDate: d.examDate ? new Date(d.examDate) : null,
      selfEstimatedLevel: d.selfEstimatedLevel,
      minutesPerDay: d.minutesPerDay,
      studyDays: JSON.stringify(d.studyDays),
      planMonths: d.planMonths,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ profile });
}
