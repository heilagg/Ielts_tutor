import { callClaudeJSON } from "@/lib/ai/client";
import { ReadingTestSchema, type ReadingTest } from "@/lib/ai/schemas";

export async function generateReadingTest(opts: {
  targetBand: number;
  focusQuestionTypes?: string[];
  fullLength?: boolean; // 3 passages / 40 questions vs a shorter practice set
  userId?: string;
}): Promise<ReadingTest> {
  const questionCount = opts.fullLength === false ? 13 : 40;
  const focus = opts.focusQuestionTypes?.length
    ? `Weight the question-type mix toward these types the student struggles with, without abandoning variety: ${opts.focusQuestionTypes.join(", ")}.`
    : "";

  const system = `You are an expert IELTS Academic Reading test writer with the standards of Cambridge English item writers. You produce original, exam-realistic material — never a copy of a real IELTS or Cambridge test. Passages must be genuinely academic in register (drawn from topics like science, history, environment, technology, sociology, business) with the complexity, paragraph structure, and vocabulary density of real IELTS Academic Reading passages (700-950 words each). Questions must have exactly one unambiguous correct answer that is fully supported by the passage text, in the same order the information appears in the passage (except matching-heading type tasks). Distribute the ${questionCount} questions across the 3 passages roughly evenly, using a realistic mix of the allowed question types.`;

  const user = `Generate a complete IELTS Academic Reading test targeting a student aiming for Band ${opts.targetBand}.
Requirements:
- Exactly 3 passages, increasing in difficulty (passage 1 easiest, passage 3 hardest), each split into labelled paragraphs (A, B, C, ...) so Matching Information / Matching Headings work.
- Exactly ${questionCount} questions total, numbered 1..${questionCount} continuously across passages.
- Use a realistic variety of question types from: Multiple Choice, True/False/Not Given, Yes/No/Not Given, Matching Headings, Matching Information, Matching Features, Sentence Completion, Summary Completion, Table Completion, Short Answer.
- Group consecutive questions of the same type together under one groupInstructions string (as real IELTS does), e.g. "Questions 1-5: Do the following statements agree with the information given in the passage? Write TRUE / FALSE / NOT GIVEN."
- For Sentence/Summary/Table Completion, prompt should include the blank as "_____" and correctAnswer should be the exact word(s) from the passage (max 3 words / a number, as per real IELTS rules — state the word limit in groupInstructions).
- correctAnswer must be answerable definitively from the passage text you write.
${focus}

Return JSON matching this TypeScript shape exactly:
{
  "title": string,
  "passages": [{ "index": 0|1|2, "title": string, "paragraphs": [{ "label": "A", "text": string }, ...] }],
  "questions": [{ "number": number, "passageIndex": 0|1|2, "groupType": one of the allowed types, "groupInstructions": string, "prompt": string, "options": string[] for Multiple Choice / Matching (list the choices) or JSON null for every other type — never the word undefined, "correctAnswer": string | string[] }]
}
This is plain JSON: use null for any field that doesn't apply, never the bare word undefined.`;

  return callClaudeJSON<ReadingTest>({
    system,
    user,
    maxTokens: 16000,
    temperature: 0.8,
    tier: "BALANCED",
    feature: "reading_generate",
    userId: opts.userId,
  }).then((raw) => ReadingTestSchema.parse(raw));
}
