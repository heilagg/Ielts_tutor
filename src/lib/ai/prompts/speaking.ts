import { callClaudeJSON } from "@/lib/ai/client";
import {
  SpeakingQuestionSetSchema,
  SpeakingEvaluationSchema,
  type SpeakingQuestionSet,
  type SpeakingEvaluation,
} from "@/lib/ai/schemas";

export async function generateSpeakingQuestions(recentTopics: string[] = [], opts: { userId?: string } = {}): Promise<SpeakingQuestionSet> {
  const system = `You are an IELTS Speaking examiner writing an authentic Part 1 / Part 2 / Part 3 question set, following the real IELTS Speaking structure and register exactly.`;
  const avoid = recentTopics.length ? `Avoid these recently used topics: ${recentTopics.join("; ")}.` : "";
  const user = `Generate one full IELTS Speaking test question set. ${avoid}
- Part 1: pick one everyday familiar topic (home, work/study, hobbies, hometown, food, daily routine, etc.) and write 4-6 short personal questions on it.
- Part 2: write a cue card on a topic connected loosely to Part 1's theme, with a "Describe a..." prompt and 3-4 bullet points ("You should say:" items), matching authentic IELTS cue card phrasing.
- Part 3: write 5-6 more abstract/analytical discussion questions that extend the Part 2 topic to broader society/opinions, matching authentic IELTS Part 3 depth.

Return JSON exactly as:
{ "part1": { "topic": string, "questions": string[] }, "part2": { "cueCardTopic": string, "prompt": string, "bulletPoints": string[] }, "part3": { "questions": string[] } }`;
  return callClaudeJSON<SpeakingQuestionSet>({
    system,
    user,
    maxTokens: 1500,
    temperature: 0.9,
    tier: "BALANCED",
    feature: "speaking_generate",
    userId: opts.userId,
  }).then((raw) => SpeakingQuestionSetSchema.parse(raw));
}

export async function evaluateSpeaking(opts: {
  part1Transcript: { question: string; answer: string }[];
  part2Transcript: { prompt: string; answer: string };
  part3Transcript: { question: string; answer: string }[];
  speechMetrics: { wordsPerMinute: number; fillerCount: number; longPauseCount: number; selfCorrections: number };
  userId?: string;
}): Promise<SpeakingEvaluation> {
  const system = `You are a certified, strict IELTS examiner grading Speaking against the official band descriptors (0-9, half-band steps) for Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation. You only have the transcript and basic speech-rate/hesitation metrics (no actual audio), so grade Pronunciation cautiously from textual cues only (self-corrections, word choice suggesting mispronunciation-driven rephrasing) and speech-rate metrics, and explicitly caveat that a transcript-only pronunciation estimate is less reliable than a human examiner listening live. Be evidence-based, never inflate. Every string value in the JSON is rendered as plain text in the app UI — never use markdown (no asterisks, no headings) inside any string field.`;

  const user = `Speech metrics: ${opts.speechMetrics.wordsPerMinute} words/min, ${opts.speechMetrics.fillerCount} filler words, ${opts.speechMetrics.longPauseCount} long pauses (>2s gaps inferred from transcription breaks), ${opts.speechMetrics.selfCorrections} self-corrections.

PART 1:
${opts.part1Transcript.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join("\n\n")}

PART 2 (cue card: ${opts.part2Transcript.prompt}):
A: ${opts.part2Transcript.answer}

PART 3:
${opts.part3Transcript.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join("\n\n")}

Score all 4 criteria and overallBand (mean, rounded to nearest 0.5, round .25 up). Give strengths, the specific problems preventing a higher band, 4-8 corrections (original phrase from transcript, problem, explanation, improved version, general rule), and pronunciationNotes (textual/rate-based observations, explicitly flagged as inferred not directly heard).

Return JSON exactly as:
{ "criteria": { "fluencyCoherence": number, "lexicalResource": number, "grammaticalRange": number, "pronunciation": number }, "overallBand": number, "strengths": string[], "problems": string[], "corrections": [{ "original": string, "problem": string, "explanation": string, "improved": string, "rule": string }], "pronunciationNotes": string[] }`;

  return callClaudeJSON<SpeakingEvaluation>({
    system,
    user,
    maxTokens: 3000,
    temperature: 0.3,
    tier: "STRONG",
    feature: "speaking_evaluate",
    userId: opts.userId,
  }).then((raw) => SpeakingEvaluationSchema.parse(raw));
}
