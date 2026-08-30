import { z } from "zod";

export const READING_QUESTION_TYPES = [
  "Multiple Choice",
  "True/False/Not Given",
  "Yes/No/Not Given",
  "Matching Headings",
  "Matching Information",
  "Matching Features",
  "Sentence Completion",
  "Summary Completion",
  "Table Completion",
  "Short Answer",
] as const;

export const ReadingQuestionSchema = z.object({
  number: z.number(),
  passageIndex: z.number().min(0).max(2),
  groupType: z.enum(READING_QUESTION_TYPES),
  groupInstructions: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
});

export const ReadingPassageSchema = z.object({
  index: z.number().min(0).max(2),
  title: z.string(),
  paragraphs: z.array(z.object({ label: z.string(), text: z.string() })),
});

export const ReadingTestSchema = z.object({
  title: z.string(),
  passages: z.array(ReadingPassageSchema).length(3),
  questions: z.array(ReadingQuestionSchema),
});
export type ReadingTest = z.infer<typeof ReadingTestSchema>;

export const LISTENING_QUESTION_TYPES = [
  "Multiple Choice",
  "Sentence Completion",
  "Table Completion",
  "Form Completion",
  "Short Answer",
  "Matching",
  "Plan/Map Labelling",
] as const;

export const ListeningQuestionSchema = z.object({
  number: z.number(),
  sectionIndex: z.number().min(0).max(3),
  groupType: z.enum(LISTENING_QUESTION_TYPES),
  groupInstructions: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
});

export const ListeningSectionSchema = z.object({
  index: z.number().min(0).max(3),
  title: z.string(),
  context: z.string(),
  script: z.string(),
  speakerVoices: z.array(z.object({ speaker: z.string(), voiceHint: z.enum(["male", "female"]) })),
});

export const ListeningTestSchema = z.object({
  title: z.string(),
  sections: z.array(ListeningSectionSchema).length(4),
  questions: z.array(ListeningQuestionSchema),
});
export type ListeningTest = z.infer<typeof ListeningTestSchema>;

export const WritingTask1Schema = z.object({
  visualType: z.enum(["line", "bar", "pie", "table", "process", "map", "mixed"]),
  prompt: z.string(),
  chartTitle: z.string(),
  chartData: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  chartSeries: z.array(z.string()).nullable().optional(),
  tableData: z
    .object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .nullable()
    .optional(),
  processSteps: z.array(z.string()).nullable().optional(),
});
export type WritingTask1 = z.infer<typeof WritingTask1Schema>;

export const WritingTask2Schema = z.object({
  questionType: z.enum([
    "opinion",
    "discussion",
    "advantages_disadvantages",
    "problem_solution",
    "two_part",
    "mixed",
  ]),
  prompt: z.string(),
});
export type WritingTask2 = z.infer<typeof WritingTask2Schema>;

export const WritingEvaluationSchema = z.object({
  criteria: z.object({
    taskAchievementOrResponse: z.number(),
    coherenceCohesion: z.number(),
    lexicalResource: z.number(),
    grammaticalRange: z.number(),
  }),
  overallBand: z.number(),
  strengths: z.array(z.string()),
  problems: z.array(z.string()),
  corrections: z.array(
    z.object({
      original: z.string(),
      problem: z.string(),
      explanation: z.string(),
      improved: z.string(),
      rule: z.string(),
      newExample: z.string(),
    })
  ),
});
export type WritingEvaluation = z.infer<typeof WritingEvaluationSchema>;

export const SpeakingQuestionSetSchema = z.object({
  part1: z.object({ topic: z.string(), questions: z.array(z.string()) }),
  part2: z.object({
    cueCardTopic: z.string(),
    prompt: z.string(),
    bulletPoints: z.array(z.string()),
  }),
  part3: z.object({ questions: z.array(z.string()) }),
});
export type SpeakingQuestionSet = z.infer<typeof SpeakingQuestionSetSchema>;

export const SpeakingEvaluationSchema = z.object({
  criteria: z.object({
    fluencyCoherence: z.number(),
    lexicalResource: z.number(),
    grammaticalRange: z.number(),
    pronunciation: z.number(),
  }),
  overallBand: z.number(),
  strengths: z.array(z.string()),
  problems: z.array(z.string()),
  corrections: z.array(
    z.object({
      original: z.string(),
      problem: z.string(),
      explanation: z.string(),
      improved: z.string(),
      rule: z.string(),
    })
  ),
  pronunciationNotes: z.array(z.string()),
});
export type SpeakingEvaluation = z.infer<typeof SpeakingEvaluationSchema>;
