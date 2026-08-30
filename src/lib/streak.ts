import { prisma } from "@/lib/prisma";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

/**
 * Counts consecutive UTC calendar days (ending today or yesterday) that had at least
 * one scored activity. Deliberately walks backward in fixed 24h steps from the current
 * instant and reads the UTC date each time (never local-time midnight) — mixing local
 * midnight with dateKey's UTC-based comparison caused this to misfire by a day for any
 * server timezone ahead of UTC (e.g. it always read 0 in UTC+5).
 */
export async function computeStudyStreak(userId: string): Promise<number> {
  const rows = await prisma.scoreHistory.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const days = new Set(rows.map((r) => dateKey(r.createdAt)));
  if (days.size === 0) return 0;

  let streak = 0;
  let cursor = new Date();

  if (!days.has(dateKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    if (!days.has(dateKey(cursor))) return 0;
  }
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}
