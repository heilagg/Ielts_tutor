function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[.,;:!?'"]/g, "")
    .replace(/\s+/g, " ");
}

/** correctAnswer as an array means "any of these forms is accepted", not a set match. */
export function isAnswerCorrect(userAnswer: string | undefined, correctAnswer: string | string[]): boolean {
  if (!userAnswer || !userAnswer.trim()) return false;
  const accepted = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  const normalizedUser = normalize(userAnswer);
  return accepted.some((a) => normalize(a) === normalizedUser);
}

export interface GradableQuestion {
  number: number;
  groupType: string;
  correctAnswer: string | string[];
}

export interface GradeResult {
  rawScore: number;
  total: number;
  unanswered: number;
  accuracyByType: Record<string, number>; // 0-1
  perQuestion: Array<{ number: number; correct: boolean; userAnswer: string | undefined; correctAnswer: string | string[] }>;
}

export function gradeQuestions(
  questions: GradableQuestion[],
  answers: Record<number, string>
): GradeResult {
  const byType: Record<string, { correct: number; total: number }> = {};
  let rawScore = 0;
  let unanswered = 0;
  const perQuestion: GradeResult["perQuestion"] = [];

  for (const q of questions) {
    const userAnswer = answers[q.number];
    if (!userAnswer || !userAnswer.trim()) unanswered++;
    const correct = isAnswerCorrect(userAnswer, q.correctAnswer);
    if (correct) rawScore++;
    byType[q.groupType] ??= { correct: 0, total: 0 };
    byType[q.groupType].total++;
    if (correct) byType[q.groupType].correct++;
    perQuestion.push({ number: q.number, correct, userAnswer, correctAnswer: q.correctAnswer });
  }

  const accuracyByType: Record<string, number> = {};
  for (const [type, { correct, total }] of Object.entries(byType)) {
    accuracyByType[type] = total > 0 ? correct / total : 0;
  }

  return { rawScore, total: questions.length, unanswered, accuracyByType, perQuestion };
}
