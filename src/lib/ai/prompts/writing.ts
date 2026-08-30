import { callClaudeJSON } from "@/lib/ai/client";
import {
  WritingTask1Schema,
  WritingTask2Schema,
  WritingEvaluationSchema,
  type WritingTask1,
  type WritingTask2,
  type WritingEvaluation,
} from "@/lib/ai/schemas";

export async function generateWritingTask1(opts: { userId?: string } = {}): Promise<WritingTask1> {
  const system = `You are an IELTS Academic Writing Task 1 item writer. You produce realistic, information-dense visuals (never decorative or trivial) with enough complexity for a genuine 150+ word description: clear trends/comparisons, plausible real-world units, and at least 2 series or categories where relevant.`;
  const user = `Generate one IELTS Academic Writing Task 1 prompt. Randomly pick a realistic visualType: line, bar, pie, table, process, or mixed (favor variety across calls). Invent plausible realistic data (e.g. real-sounding country names, years, percentages, quantities) — internally consistent and detailed enough to support a full response.
For visualType "line" or "bar" or "mixed": populate chartData as an array of row objects, each with a "label" (e.g. year or category) key and one numeric key per series; list series names in chartSeries.
For "pie": chartData rows should have "label" and "value".
For "table": populate tableData with headers and rows instead of chartData.
For "process": populate processSteps as an ordered array of short stage descriptions (chartData can be []).
For "map": describe two/three time points of a location change entirely in the prompt text (chartData: []).

Return JSON exactly as (this is plain JSON — any field you don't use must be the JSON value null, never the bare word undefined, and never omitted):
{ "visualType": "...", "prompt": "the exact IELTS-style instruction, e.g. 'The chart below shows ... Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'", "chartTitle": string, "chartData": [...] (use [] if not applicable), "chartSeries": string[] or null, "tableData": {"headers": string[], "rows": string[][]} or null, "processSteps": string[] or null }`;
  return callClaudeJSON<WritingTask1>({
    system,
    user,
    maxTokens: 2000,
    temperature: 0.9,
    tier: "BALANCED",
    feature: "writing_generate_task1",
    userId: opts.userId,
  }).then((raw) => WritingTask1Schema.parse(raw));
}

export async function generateWritingTask2(recentTopics: string[] = [], opts: { userId?: string } = {}): Promise<WritingTask2> {
  const system = `You are an IELTS Academic Writing Task 2 item writer. You write authentic, exam-realistic essay prompts covering typical IELTS topics (education, technology, environment, government, health, work, society, globalization, media) using authentic IELTS phrasing patterns.`;
  const avoid = recentTopics.length
    ? `Avoid repeating these recently-used topics: ${recentTopics.join("; ")}.`
    : "";
  const user = `Generate one IELTS Academic Writing Task 2 essay question. Randomly choose questionType from: opinion, discussion, advantages_disadvantages, problem_solution, two_part, mixed (favor variety). ${avoid}
Return JSON exactly as: { "questionType": "...", "prompt": "the exact IELTS-style question ending with 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.' or the appropriate closing instruction, plus 'Write at least 250 words.'" }`;
  return callClaudeJSON<WritingTask2>({
    system,
    user,
    maxTokens: 1000,
    temperature: 0.9,
    tier: "BALANCED",
    feature: "writing_generate_task2",
    userId: opts.userId,
  }).then((raw) => WritingTask2Schema.parse(raw));
}

export async function evaluateWriting(opts: {
  taskType: "TASK1" | "TASK2";
  prompt: string;
  essayText: string;
  wordCount: number;
  previousEssaysSummary?: string;
  userId?: string;
}): Promise<WritingEvaluation> {
  const criterionName = opts.taskType === "TASK1" ? "Task Achievement" : "Task Response";
  const system = `You are a certified, strict IELTS examiner grading Academic Writing ${opts.taskType === "TASK1" ? "Task 1" : "Task 2"} against the official IELTS band descriptors (0-9, in 0.5 steps) for: ${criterionName}, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Be objective and evidence-based — never inflate a score. If evidence is mixed, choose the lower of two plausible bands and explain what is missing for the higher one. Do not just rewrite the essay: your job is to teach the underlying rule so the mistake stops recurring. Every string value in the JSON is rendered as plain text in the app UI — never use markdown (no asterisks, no headings) inside any string field.
${opts.previousEssaysSummary ? `Context on this student's history: ${opts.previousEssaysSummary}` : ""}`;

  const user = `Task prompt given to the student:
"""
${opts.prompt}
"""

Student's response (word count: ${opts.wordCount}):
"""
${opts.essayText}
"""

${
  opts.taskType === "TASK1" && opts.wordCount < 150
    ? "Note the response is under the required 150 words — this must weigh down Task Achievement."
    : ""
}${
  opts.taskType === "TASK2" && opts.wordCount < 250
    ? "Note the response is under the required 250 words — this must weigh down Task Response."
    : ""
}

Score all 4 criteria (0-9, half-band steps) and compute overallBand as the mean of the 4 rounded to the nearest 0.5 (round .25 up). List concrete strengths, list the specific problems currently preventing a higher band (be specific about which criterion each maps to), and produce 4-8 "corrections" entries for the most important recurring or band-limiting mistakes. Each correction must contain: the exact original sentence/phrase from the essay, the problem, a clear explanation, an improved version, the general grammar/lexical rule being taught, and one new example sentence demonstrating the rule in a different context.

Return JSON exactly as:
{ "criteria": { "taskAchievementOrResponse": number, "coherenceCohesion": number, "lexicalResource": number, "grammaticalRange": number }, "overallBand": number, "strengths": string[], "problems": string[], "corrections": [{ "original": string, "problem": string, "explanation": string, "improved": string, "rule": string, "newExample": string }] }`;

  return callClaudeJSON<WritingEvaluation>({
    system,
    user,
    maxTokens: 4000,
    temperature: 0.3,
    tier: "STRONG",
    feature: "writing_evaluate",
    userId: opts.userId,
  }).then((raw) => WritingEvaluationSchema.parse(raw));
}
