import type { PeriodReportData } from "@/lib/reports";

export function summarizeReportData(data: PeriodReportData): string {
  const scoreLines = Object.entries(data.scoresBySkill)
    .filter(([, v]) => v.start != null || v.end != null)
    .map(([skill, v]) => `${skill}: ${v.start ?? "—"} → ${v.end ?? "—"} (${v.delta != null ? (v.delta > 0 ? "+" : "") + v.delta : "no change recorded"})`)
    .join("; ");

  return `Study time: ~${data.studyMinutes} minutes. Tasks completed: ${data.tasksCompleted}. Vocabulary words added: ${data.vocabularyLearned}. Mistakes corrected (mastered): ${data.errorsCorrected}. New mistakes logged: ${data.newErrorsLogged}.
Score changes: ${scoreLines || "no scores recorded this period"}.
Improved: ${data.improved.join(", ") || "nothing measurable"}.
Did not improve: ${data.notImproved.join(", ") || "nothing flagged"}.
Biggest problem (pre-computed): ${data.biggestProblem}
Suggested next focus (pre-computed): ${data.nextFocus}`;
}
