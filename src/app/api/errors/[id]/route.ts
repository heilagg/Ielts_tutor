import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { checkAndUnlockAchievements } from "@/lib/gamification";

const BodySchema = z.object({ masteryStatus: z.enum(["ACTIVE", "IMPROVING", "MASTERED"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  const { id } = await params;
  const entry = await prisma.errorEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.errorEntry.update({ where: { id }, data: { masteryStatus: parsed.data.masteryStatus } });
  if (parsed.data.masteryStatus === "MASTERED") await checkAndUnlockAchievements(userId);
  return NextResponse.json({ entry: updated });
}
