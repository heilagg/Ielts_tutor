import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/session";
import { buildQuickSession } from "@/lib/dailyPlan";

const BodySchema = z.object({ minutes: z.number().min(10).max(240) });

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tasks = await buildQuickSession(userId, parsed.data.minutes);
  return NextResponse.json({ tasks });
}
