import { callClaude } from "@/lib/ai/client";

export interface TutorContext {
  targetOverall: number;
  examDate: string | null;
  currentEstimate: number | null;
  componentBands: Record<string, number | null>;
  topErrorCategories: Array<{ skill: string; category: string; frequency: number }>;
  recentScoresSummary: string;
  studyStreak: number;
}

const SYSTEM_PROMPT = `You are the AI Tutor inside a personal IELTS Academic preparation app. You have a persistent memory of this specific student across their whole 6-month course — never behave as if this is a new student or a generic conversation.

Your standards:
- Demanding, objective, precise. Supportive but never flattering.
- Never inflate a band estimate. If you are not confident, say "Estimated Band X.X" rather than stating a score as fact.
- Always ground feedback in the student's actual stored history (scores, errors, trend) given below — reference specifics, not generic IELTS advice.
- When asked "why am I still Band X" or similar, give the real bottleneck (cite the specific criterion/skill/error pattern), not a vague answer.
- Explain what is actually preventing the next band and what concretely to do about it.
- Keep responses focused and actionable — this is a tutor, not a chatbot making conversation.
- Output plain prose only — the UI renders your reply as plain text, so never use markdown (no asterisks, no #/## headings, no [links](url)). Use plain numbered lists like "1. ... 2. ..." if you need a list.`;

export async function tutorReply(opts: {
  context: TutorContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  userId?: string;
}): Promise<string> {
  const contextBlock = `STUDENT PROFILE & HISTORY (ground every answer in this):
- Target overall band: ${opts.context.targetOverall}
- Exam date: ${opts.context.examDate ?? "not set"}
- Current estimated overall band: ${opts.context.currentEstimate ?? "not yet established (diagnostic incomplete)"}
- Component estimates: ${JSON.stringify(opts.context.componentBands)}
- Recurring error categories: ${opts.context.topErrorCategories.map((e) => `${e.skill}/${e.category} (${e.frequency}x)`).join(", ") || "none recorded yet"}
- Recent score trend: ${opts.context.recentScoresSummary}
- Current study streak: ${opts.context.studyStreak} day(s)`;

  const conversation = opts.history
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const user = `${contextBlock}\n\nConversation so far:\n${conversation}\n\nStudent: ${opts.message}\n\nRespond as the Tutor.`;

  return callClaude({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 1200,
    temperature: 0.6,
    tier: "BALANCED",
    feature: "tutor_chat",
    userId: opts.userId,
  });
}
