/**
 * SM-2 spaced-repetition scheduling (section 30) for the mistake-flashcard queue.
 * Standard algorithm (Wozniak, SuperMemo SM-2): https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
export type SrsGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

const GRADE_TO_QUALITY: Record<SrsGrade, number> = {
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
};

export interface SrsState {
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

export function applySm2(state: SrsState, grade: SrsGrade, now: Date = new Date()): SrsResult {
  const quality = GRADE_TO_QUALITY[grade];
  let { repetitionCount, easeFactor, intervalDays } = state;

  if (quality < 3) {
    repetitionCount = 0;
    intervalDays = 1;
  } else {
    repetitionCount += 1;
    if (repetitionCount === 1) intervalDays = 1;
    else if (repetitionCount === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000);
  return { repetitionCount, easeFactor, intervalDays, dueAt };
}

/** A card graded GOOD/EASY enough times with a long enough interval is considered mastered. */
export function masteryStatusFor(result: SrsResult): "ACTIVE" | "IMPROVING" | "MASTERED" {
  if (result.repetitionCount >= 4 && result.intervalDays >= 21) return "MASTERED";
  if (result.repetitionCount >= 2) return "IMPROVING";
  return "ACTIVE";
}
