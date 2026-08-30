import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { getOrCreateMonthlyReport } from "@/lib/reports";
import { generateReportNarrative } from "@/lib/ai/prompts/coaching";
import { AIUnavailableError } from "@/lib/ai/client";
import { summarizeReportData } from "@/lib/reportSummary";

export async function POST() {
  const userId = await getUserId();
  const { data } = await getOrCreateMonthlyReport(userId);

  try {
    const narrative = await generateReportNarrative({ periodLabel: "month", dataSummary: summarizeReportData(data), userId });
    return NextResponse.json({ narrative });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Monthly report narrative failed:", err);
    return NextResponse.json({ error: "AI narrative unavailable right now — the data above still applies." }, { status: 503 });
  }
}
