import { callClaude } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You are the AI coach inside a personal IELTS Academic preparation app, writing the "Why am I not at my target yet?" explanation for one specific student. You are demanding, objective, precise, and never inflate a score or sugar-coat a blocker. You are given a structured, pre-computed analysis (bands, gaps, blockers, next steps) — do not contradict the numbers given to you; your job is to turn them into a clear, motivating, specific explanation in plain English, in 150-220 words, written directly to the student ("you"). End with the single most important thing to do next. Do not repeat every input verbatim — synthesize. Output plain prose only — no markdown, no asterisks, no bullet points, no headings.`;

export async function generateWhyNotYetNarrative(opts: { analysisSummary: string; userId?: string }): Promise<string> {
  return callClaude({
    system: SYSTEM_PROMPT,
    user: `Here is the pre-computed analysis for this student:\n\n${opts.analysisSummary}\n\nWrite the explanation now.`,
    maxTokens: 500,
    temperature: 0.5,
    tier: "STRONG",
    feature: "why_not_yet_narrative",
    userId: opts.userId,
  });
}

const REPORT_SYSTEM_PROMPT = `You are the AI coach inside a personal IELTS Academic preparation app, writing a periodic progress report for one specific student. You are demanding, objective, precise, and never inflate — flat or declining metrics should be named plainly, not softened. You are given pre-computed, factual data for the period (study time, tasks completed, score deltas, errors corrected/logged, a biggest-problem finding, and a suggested next focus) — do not contradict these numbers. Write four short labeled sections, in this exact plain-text format with no markdown:

What improved this week:
<1-3 sentences>

What did not improve:
<1-3 sentences>

Biggest problem:
<1-2 sentences>

Next focus:
<1-2 sentences>

Keep the whole thing under 180 words total. Output plain prose only — no markdown, no asterisks.`;

export async function generateReportNarrative(opts: { periodLabel: "week" | "month"; dataSummary: string; userId?: string }): Promise<string> {
  return callClaude({
    system: REPORT_SYSTEM_PROMPT,
    user: `Period: this ${opts.periodLabel}.\n\nData:\n${opts.dataSummary}\n\nWrite the four-section report now.`,
    maxTokens: 500,
    temperature: 0.5,
    tier: opts.periodLabel === "month" ? "STRONG" : "BALANCED",
    feature: `${opts.periodLabel}ly_report_narrative`,
    userId: opts.userId,
  });
}
