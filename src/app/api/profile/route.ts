import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const BodySchema = z.object({
  targetOverall: z.number().min(4).max(9).optional(),
  examDate: z.string().nullable().optional(),
  minutesPerDay: z.number().min(15).max(300).optional(),
  studyDays: z.array(z.number().min(0).max(6)).optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const profile = await prisma.profile.update({
    where: { userId },
    data: {
      ...(d.targetOverall !== undefined && {
        targetOverall: d.targetOverall,
        targetReading: d.targetOverall,
        targetListening: d.targetOverall,
        targetWriting: Math.min(d.targetOverall, 7.0),
        targetSpeaking: Math.min(d.targetOverall, 7.0),
      }),
      ...(d.examDate !== undefined && { examDate: d.examDate ? new Date(d.examDate) : null }),
      ...(d.minutesPerDay !== undefined && { minutesPerDay: d.minutesPerDay }),
      ...(d.studyDays !== undefined && { studyDays: JSON.stringify(d.studyDays) }),
    },
  });

  return NextResponse.json({ profile });
}
