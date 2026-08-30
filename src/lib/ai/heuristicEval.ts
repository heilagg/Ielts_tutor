/**
 * Low-fidelity heuristic evaluators used ONLY when ANTHROPIC_API_KEY is not configured.
 * They compute real statistics from the student's text (not fabricated scores), but are
 * far less reliable than the Claude-based rubric evaluation — every caller must surface
 * the "heuristic estimate" label to the user.
 */
import type { WritingEvaluation, SpeakingEvaluation } from "@/lib/ai/schemas";

const LINKING_WORDS = [
  "however", "therefore", "moreover", "furthermore", "in addition", "although",
  "despite", "consequently", "as a result", "in contrast", "on the other hand",
  "for example", "for instance", "in conclusion", "overall", "firstly", "secondly",
];

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
}

function typeTokenRatio(text: string): number {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function clampBand(n: number): number {
  return Math.max(3, Math.min(8, Math.round(n * 2) / 2));
}

export function evaluateWritingHeuristic(opts: {
  taskType: "TASK1" | "TASK2";
  essayText: string;
  wordCount: number;
}): WritingEvaluation {
  const minWords = opts.taskType === "TASK1" ? 150 : 250;
  const sentences = splitSentences(opts.essayText);
  const avgSentenceLen = sentences.length ? opts.wordCount / sentences.length : 0;
  const ttr = typeTokenRatio(opts.essayText);
  const linkersUsed = LINKING_WORDS.filter((w) => opts.essayText.toLowerCase().includes(w)).length;
  const paragraphs = opts.essayText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;

  const lengthScore = opts.wordCount >= minWords ? 6.5 : 5;
  const cohesionScore = clampBand(4.5 + Math.min(linkersUsed, 6) * 0.3 + (paragraphs >= 3 ? 0.5 : 0));
  const lexicalScore = clampBand(4 + ttr * 10);
  const grammarScore = clampBand(4.5 + Math.min(avgSentenceLen / 10, 2));
  const taScore = clampBand(lengthScore);

  const overallBand =
    Math.round(((taScore + cohesionScore + lexicalScore + grammarScore) / 4) * 2) / 2;

  return {
    criteria: {
      taskAchievementOrResponse: taScore,
      coherenceCohesion: cohesionScore,
      lexicalResource: lexicalScore,
      grammaticalRange: grammarScore,
    },
    overallBand,
    strengths: [
      opts.wordCount >= minWords ? `Meets the minimum word count (${opts.wordCount} words).` : "",
      linkersUsed >= 3 ? "Uses a reasonable range of linking devices." : "",
      paragraphs >= 3 ? "Response is organised into multiple paragraphs." : "",
    ].filter(Boolean),
    problems: [
      opts.wordCount < minWords ? `Below the required ${minWords}-word minimum — this caps Task ${opts.taskType === "TASK1" ? "Achievement" : "Response"}.` : "",
      linkersUsed < 3 ? "Limited use of cohesive devices (linking words) detected." : "",
      ttr < 0.4 ? "Vocabulary range appears limited (high word repetition detected)." : "",
      "This is a heuristic estimate (word-count/sentence-length/vocabulary-diversity statistics only) — it cannot assess grammatical accuracy, task fulfilment, or argument quality the way a real IELTS examiner or the Claude-based evaluator can. Configure ANTHROPIC_API_KEY for a full rubric evaluation.",
    ].filter(Boolean),
    corrections: [],
  };
}

export function evaluateSpeakingHeuristic(opts: {
  fullTranscript: string;
  speechMetrics: { wordsPerMinute: number; fillerCount: number; longPauseCount: number; selfCorrections: number };
}): SpeakingEvaluation {
  const ttr = typeTokenRatio(opts.fullTranscript);
  const { wordsPerMinute, fillerCount, longPauseCount } = opts.speechMetrics;

  const fluencyScore = clampBand(
    5 + (wordsPerMinute > 110 && wordsPerMinute < 190 ? 1 : 0) - Math.min(fillerCount / 5, 1.5) - Math.min(longPauseCount / 4, 1)
  );
  const lexicalScore = clampBand(4 + ttr * 10);
  const grammarScore = clampBand(5);
  const pronunciationScore = clampBand(5);
  const overallBand = Math.round(((fluencyScore + lexicalScore + grammarScore + pronunciationScore) / 4) * 2) / 2;

  return {
    criteria: {
      fluencyCoherence: fluencyScore,
      lexicalResource: lexicalScore,
      grammaticalRange: grammarScore,
      pronunciation: pronunciationScore,
    },
    overallBand,
    strengths: [wordsPerMinute > 110 ? "Maintains a natural speaking pace." : ""].filter(Boolean),
    problems: [
      fillerCount > 8 ? "Frequent filler words detected, which can interrupt fluency." : "",
      "This is a heuristic estimate from speech-rate and vocabulary-diversity statistics only — it cannot assess grammar or pronunciation the way the Claude-based evaluator can. Configure ANTHROPIC_API_KEY for a full rubric evaluation.",
    ].filter(Boolean),
    corrections: [],
    pronunciationNotes: ["Pronunciation cannot be reliably estimated without AI evaluation of the transcript context."],
  };
}
