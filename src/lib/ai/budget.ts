import { prisma } from "@/lib/prisma";

export class AiBudgetExceededError extends Error {
  constructor(scope: "daily" | "monthly", limitUsd: number) {
    super(
      `${scope === "daily" ? "Daily" : "Monthly"} AI usage limit of $${limitUsd.toFixed(2)} reached. ` +
        `Raise ${scope === "daily" ? "AI_DAILY_COST_LIMIT_USD" : "AI_MONTHLY_COST_LIMIT_USD"} in .env to continue, or wait for the period to reset.`
    );
    this.name = "AiBudgetExceededError";
  }
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Section 63 (API cost control): never let the app silently spend past a limit the
 * user set. Both limits are optional — unset means unlimited. Checked before every
 * AI call in src/lib/ai/client.ts.
 */
export async function assertWithinAiBudget(userId: string): Promise<void> {
  const dailyLimit = process.env.AI_DAILY_COST_LIMIT_USD ? Number(process.env.AI_DAILY_COST_LIMIT_USD) : null;
  const monthlyLimit = process.env.AI_MONTHLY_COST_LIMIT_USD ? Number(process.env.AI_MONTHLY_COST_LIMIT_USD) : null;
  if (!dailyLimit && !monthlyLimit) return;

  const now = new Date();
  if (dailyLimit) {
    const spend = await prisma.aiUsageLog.aggregate({
      where: { userId, createdAt: { gte: startOfDayUtc(now) } },
      _sum: { estimatedCostUsd: true },
    });
    if ((spend._sum.estimatedCostUsd ?? 0) >= dailyLimit) throw new AiBudgetExceededError("daily", dailyLimit);
  }
  if (monthlyLimit) {
    const spend = await prisma.aiUsageLog.aggregate({
      where: { userId, createdAt: { gte: startOfMonthUtc(now) } },
      _sum: { estimatedCostUsd: true },
    });
    if ((spend._sum.estimatedCostUsd ?? 0) >= monthlyLimit) throw new AiBudgetExceededError("monthly", monthlyLimit);
  }
}

export async function getAiUsageSummary(userId: string) {
  const now = new Date();
  const [today, month, allTime, byFeature] = await Promise.all([
    prisma.aiUsageLog.aggregate({ where: { userId, createdAt: { gte: startOfDayUtc(now) } }, _sum: { estimatedCostUsd: true }, _count: true }),
    prisma.aiUsageLog.aggregate({ where: { userId, createdAt: { gte: startOfMonthUtc(now) } }, _sum: { estimatedCostUsd: true }, _count: true }),
    prisma.aiUsageLog.aggregate({ where: { userId }, _sum: { estimatedCostUsd: true }, _count: true }),
    prisma.aiUsageLog.groupBy({ by: ["feature"], where: { userId }, _sum: { estimatedCostUsd: true }, orderBy: { _sum: { estimatedCostUsd: "desc" } }, take: 8 }),
  ]);

  return {
    todayCostUsd: today._sum.estimatedCostUsd ?? 0,
    todayCalls: today._count,
    monthCostUsd: month._sum.estimatedCostUsd ?? 0,
    monthCalls: month._count,
    allTimeCostUsd: allTime._sum.estimatedCostUsd ?? 0,
    allTimeCalls: allTime._count,
    byFeature: byFeature.map((f) => ({ feature: f.feature, costUsd: f._sum.estimatedCostUsd ?? 0 })),
    dailyLimitUsd: process.env.AI_DAILY_COST_LIMIT_USD ? Number(process.env.AI_DAILY_COST_LIMIT_USD) : null,
    monthlyLimitUsd: process.env.AI_MONTHLY_COST_LIMIT_USD ? Number(process.env.AI_MONTHLY_COST_LIMIT_USD) : null,
  };
}
