import { callClaudeJSON } from "@/lib/ai/client";
import { ListeningTestSchema, type ListeningTest } from "@/lib/ai/schemas";

export async function generateListeningTest(opts: {
  targetBand: number;
  focusQuestionTypes?: string[];
  fullLength?: boolean;
  userId?: string;
}): Promise<ListeningTest> {
  const questionCount = opts.fullLength === false ? 10 : 40;
  const perSection = Math.round(questionCount / 4);
  const focus = opts.focusQuestionTypes?.length
    ? `Weight the question-type mix toward: ${opts.focusQuestionTypes.join(", ")}.`
    : "";

  const system = `You are an expert IELTS Listening test writer. You write the full spoken-word SCRIPT for each section (not just questions) as natural conversational or lecture English matching real IELTS Listening sections:
Section 1: everyday conversation between two people (e.g. booking, enquiry) — mostly factual/transactional.
Section 2: monologue on an everyday/social topic (e.g. a talk about a facility).
Section 3: conversation between up to 4 people in an academic context (e.g. students discussing an assignment with a tutor).
Section 4: academic monologue/lecture.
Scripts should be long enough to naturally contain the answers to the questions for that section (250-450 words per section), written to be read aloud, with natural discourse markers, occasional distractors (a wrong answer mentioned then corrected — a classic IELTS trap), and clear points where each answer appears in order.`;

  const user = `Generate a complete IELTS Listening test targeting a student aiming for Band ${opts.targetBand}.
Requirements:
- Exactly 4 sections as described, each with its own script, a short context description, and a speakerVoices list naming each distinct speaker with a voiceHint of "male" or "female" (used to pick a text-to-speech voice).
- Exactly ${questionCount} questions total, numbered 1..${questionCount} continuously, about ${perSection} per section.
- Use a realistic mix of: Multiple Choice, Sentence Completion, Table Completion, Form Completion, Short Answer, Matching, Plan/Map Labelling (use Plan/Map Labelling sparingly since it needs a described layout in the prompt text).
- Group consecutive same-type questions with one groupInstructions string per group, stating any word/number limit (e.g. "Write NO MORE THAN TWO WORDS AND/OR A NUMBER").
- correctAnswer must be exactly what is stated in that section's script (a name, number, word, or short phrase actually present in the script).
${focus}

Return JSON matching this TypeScript shape exactly:
{
  "title": string,
  "sections": [{ "index": 0|1|2|3, "title": string, "context": string, "script": string, "speakerVoices": [{ "speaker": string, "voiceHint": "male"|"female" }] }],
  "questions": [{ "number": number, "sectionIndex": 0|1|2|3, "groupType": one of the allowed types, "groupInstructions": string, "prompt": string, "options": string[] for Multiple Choice/Matching or JSON null for every other type — never the word undefined, "correctAnswer": string | string[] }]
}
This is plain JSON: use null for any field that doesn't apply, never the bare word undefined.`;

  return callClaudeJSON<ListeningTest>({
    system,
    user,
    maxTokens: 16000,
    temperature: 0.8,
    tier: "BALANCED",
    feature: "listening_generate",
    userId: opts.userId,
  }).then((raw) =>
    ListeningTestSchema.parse(raw)
  );
}
