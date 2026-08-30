import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface SpeakingResultsData {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  pronunciation: number;
  overallBand: number;
  strengths: string[];
  problems: string[];
  corrections: Array<{ original: string; problem: string; explanation: string; improved: string; rule: string }>;
  pronunciationNotes: string[];
  metrics: { wordsPerMinute: number; fillerCount: number; longPauseCount: number; selfCorrections: number };
  returnTo: string;
}

export function SpeakingResults({ data }: { data: SpeakingResultsData }) {
  return (
    <div className="min-h-screen safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-xl font-semibold mb-1">Speaking feedback</h1>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">AI-estimated IELTS band — not an official IELTS score.</p>

        <Card className="mb-6 text-center py-8">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Estimated overall band</p>
          <p className="text-5xl font-bold" style={{ color: "var(--color-primary-2)" }}>
            {data.overallBand.toFixed(1)}
          </p>
        </Card>

        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <ScoreItem label="Fluency & Coherence" value={data.fluencyCoherence} />
            <ScoreItem label="Lexical Resource" value={data.lexicalResource} />
            <ScoreItem label="Grammatical Range & Accuracy" value={data.grammaticalRange} />
            <ScoreItem label="Pronunciation" value={data.pronunciation} />
          </div>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-3">Speech metrics</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Metric label="Speaking rate" value={`${data.metrics.wordsPerMinute} wpm`} />
            <Metric label="Filler words" value={String(data.metrics.fillerCount)} />
            <Metric label="Long pauses" value={String(data.metrics.longPauseCount)} />
            <Metric label="Self-corrections" value={String(data.metrics.selfCorrections)} />
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

        {data.pronunciationNotes.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-2">Pronunciation notes</p>
            <ul className="text-sm flex flex-col gap-1.5 list-disc pl-4">
              {data.pronunciationNotes.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
        )}

        {data.corrections.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-3">Detailed corrections</p>
            <div className="flex flex-col gap-4">
              {data.corrections.map((c, i) => (
                <div key={i} className="text-xs border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0">
                  <p className="mb-1">
                    <span className="font-semibold text-[var(--color-danger)]">Said: </span>
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
                    <span className="font-semibold text-[var(--color-success)]">Better: </span>
                    <span className="italic">&ldquo;{c.improved}&rdquo;</span>
                  </p>
                  <p>
                    <span className="font-semibold">Rule: </span>
                    {c.rule}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
