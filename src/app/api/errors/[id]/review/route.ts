import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { applySm2, masteryStatusFor } from "@/lib/srs";
import { checkAndUnlockAchievements } from "@/lib/gamification";

const BodySchema = z.object({ grade: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  const { id } = await params;
  const entry = await prisma.errorEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = applySm2(
    { repetitionCount: entry.repetitionCount, easeFactor: entry.easeFactor, intervalDays: entry.intervalDays },
    parsed.data.grade
  );
  const masteryStatus = masteryStatusFor(result);

  const updated = await prisma.errorEntry.update({
    where: { id },
    data: {
      repetitionCount: result.repetitionCount,
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      dueAt: result.dueAt,
      masteryStatus,
    },
  });

  if (masteryStatus === "MASTERED") await checkAndUnlockAchievements(userId);
  return NextResponse.json({ entry: updated });
}
