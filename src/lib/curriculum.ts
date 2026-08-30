export interface RoadmapPhase {
  month: number;
  title: string;
  desc: string;
  focus: string[];
}

export const ROADMAP: RoadmapPhase[] = [
  {
    month: 1,
    title: "Foundation & diagnosis",
    desc: "IELTS format, grammar fundamentals, core vocabulary, reading/listening fundamentals, essay structure, speaking fluency.",
    focus: ["IELTS question types", "Core grammar accuracy", "High-frequency academic vocabulary", "Basic essay structure"],
  },
  {
    month: 2,
    title: "Skill development",
    desc: "Targeted work on the question types and skills identified as weak in your diagnostic.",
    focus: ["Weak question types", "Paragraph coherence", "Topic vocabulary", "Speaking Part 2 fluency"],
  },
  {
    month: 3,
    title: "Timed IELTS practice",
    desc: "Full-length timed practice under realistic conditions across all four skills.",
    focus: ["Full timed Reading/Listening sets", "Task 1 & 2 under 20/40 min", "Weekly full mocks begin"],
  },
  {
    month: 4,
    title: "Advanced training",
    desc: "Harder material, more complex argumentation, faster reading/listening pace.",
    focus: ["Higher-difficulty passages", "Complex sentence structures", "Nuanced Part 3 discussion"],
  },
  {
    month: 5,
    title: "Band 7-8 optimization",
    desc: "Precision work on the specific criteria capping your score just below target.",
    focus: ["Band-limiting criteria from your error log", "Precision vocabulary and collocations", "Argument depth"],
  },
  {
    month: 6,
    title: "Exam simulation & final prep",
    desc: "Full mock exams under strict conditions, final error review, exam-day strategy.",
    focus: ["Monthly full mock exams", "Final error review", "Exam-day timing strategy"],
  },
];

export function getCurrentPhase(profileCreatedAt: Date, planMonths: number): RoadmapPhase {
  const weeksSinceStart = (Date.now() - profileCreatedAt.getTime()) / (7 * 86_400_000);
  const monthIndex = Math.min(planMonths, Math.max(1, Math.floor(weeksSinceStart / 4.33) + 1));
  const scaledIndex = Math.min(ROADMAP.length, Math.max(1, Math.round((monthIndex / planMonths) * ROADMAP.length)));
  return ROADMAP[scaledIndex - 1];
}
