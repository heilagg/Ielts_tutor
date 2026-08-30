import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { getOrCreateWeeklyReport } from "@/lib/reports";
import { generateReportNarrative } from "@/lib/ai/prompts/coaching";
import { AIUnavailableError } from "@/lib/ai/client";
import { summarizeReportData } from "@/lib/reportSummary";

export async function POST() {
  const userId = await getUserId();
  const { data } = await getOrCreateWeeklyReport(userId);

  try {
    const narrative = await generateReportNarrative({ periodLabel: "week", dataSummary: summarizeReportData(data), userId });
    return NextResponse.json({ narrative });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Weekly report narrative failed:", err);
    return NextResponse.json({ error: "AI narrative unavailable right now — the data above still applies." }, { status: 503 });
  }
}
