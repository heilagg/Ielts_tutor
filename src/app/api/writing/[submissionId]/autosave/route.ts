import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const BodySchema = z.object({ essayText: z.string(), wordCount: z.number() });

export async function PATCH(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const userId = await getUserId();
  const { submissionId } = await params;
  const submission = await prisma.writingSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.overallBand != null) return NextResponse.json({ error: "Already evaluated" }, { status: 409 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.writingSubmission.update({
    where: { id: submissionId },
    data: { essayText: parsed.data.essayText, wordCount: parsed.data.wordCount },
  });

  return NextResponse.json({ ok: true });
}
