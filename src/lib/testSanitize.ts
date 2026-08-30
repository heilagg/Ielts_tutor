import type { ReadingTest, ListeningTest } from "@/lib/ai/schemas";

export type SanitizedReadingQuestion = Omit<ReadingTest["questions"][number], "correctAnswer">;
export type SanitizedReadingTest = Omit<ReadingTest, "questions"> & { questions: SanitizedReadingQuestion[] };

export function stripReadingAnswers(test: ReadingTest): SanitizedReadingTest {
  return {
    ...test,
    questions: test.questions.map(({ correctAnswer: _correctAnswer, ...rest }) => rest),
  };
}

export type SanitizedListeningQuestion = Omit<ListeningTest["questions"][number], "correctAnswer">;
export type SanitizedListeningTest = Omit<ListeningTest, "questions"> & {
  questions: SanitizedListeningQuestion[];
};

/**
 * Strips answers. The script text is intentionally KEPT (unlike Reading) because the
 * browser's speech-synthesis engine needs the raw text client-side to read it aloud —
 * there is no server-side audio pipeline in this build. The UI never renders the script
 * as visible text until after submission, so it stays hidden from normal use even though
 * it is technically present in the page's JS state.
 */
export function stripListeningAnswers(test: ListeningTest): SanitizedListeningTest {
  return {
    ...test,
    questions: test.questions.map(({ correctAnswer: _correctAnswer, ...rest }) => rest),
  };
}
