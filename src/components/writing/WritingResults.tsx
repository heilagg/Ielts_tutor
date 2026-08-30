import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface WritingResultsData {
  taskType: "TASK1" | "TASK2";
  essayText: string;
  wordCount: number;
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
  overallBand: number;
  strengths: string[];
  problems: string[];
  corrections: Array<{ original: string; problem: string; explanation: string; improved: string; rule: string; newExample: string }>;
  returnTo: string;
}

export function WritingResults({ data }: { data: WritingResultsData }) {
  const criterionLabel = data.taskType === "TASK1" ? "Task Achievement" : "Task Response";

  return (
    <div className="min-h-screen safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-xl font-semibold mb-1">Writing {data.taskType === "TASK1" ? "Task 1" : "Task 2"} feedback</h1>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">AI-estimated IELTS band — not an official IELTS score.</p>

        <Card className="mb-6 text-center py-8">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Estimated overall band</p>
          <p className="text-5xl font-bold" style={{ color: "var(--color-primary-2)" }}>
            {data.overallBand.toFixed(1)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">{data.wordCount} words</p>
        </Card>

        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <ScoreItem label={criterionLabel} value={data.taskAchievement} />
            <ScoreItem label="Coherence & Cohesion" value={data.coherenceCohesion} />
            <ScoreItem label="Lexical Resource" value={data.lexicalResource} />
            <ScoreItem label="Grammatical Range & Accuracy" value={data.grammaticalRange} />
          </div>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-2 text-[var(--color-success)]">Strengths</p>
          <ul className="text-sm flex flex-col gap-1.5 list-disc pl-4">
            {data.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-2 text-[var(--color-danger)]">What&apos;s preventing a higher band</p>
          <ul className="text-sm flex flex-col gap-1.5 list-disc pl-4">
            {data.problems.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>

        {data.corrections.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-3">Detailed corrections</p>
            <div className="flex flex-col gap-4">
              {data.corrections.map((c, i) => (
                <div key={i} className="text-xs border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0">
                  <p className="mb-1">
                    <span className="font-semibold text-[var(--color-danger)]">Original: </span>
                    <span className="italic">&ldquo;{c.original}&rdquo;</span>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Problem: </span>
                    {c.problem}
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Explanation: </span>
                    {c.explanation}
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold text-[var(--color-success)]">Improved: </span>
                    <span className="italic">&ldquo;{c.improved}&rdquo;</span>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Rule: </span>
                    {c.rule}
                  </p>
                  <p>
                    <span className="font-semibold">New example: </span>
                    <span className="italic">{c.newExample}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Link href={data.returnTo}>
          <Button size="lg" className="w-full">
            Done
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-lg font-semibold">{value.toFixed(1)}</p>
    </div>
  );
}
