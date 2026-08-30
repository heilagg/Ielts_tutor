import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const BodySchema = z.object({
  userExample: z.string().optional(),
  mastery: z.enum(["NEW", "LEARNING", "MASTERED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  const { id } = await params;
  const entry = await prisma.vocabularyEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.vocabularyEntry.update({
    where: { id },
    data: { ...parsed.data, lastReviewedAt: new Date() },
  });
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  const { id } = await params;
  const entry = await prisma.vocabularyEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.vocabularyEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
