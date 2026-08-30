"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ReadingTest } from "@/lib/ai/schemas";

export function ReadingResults({
  test,
  answers,
  rawScore,
  band,
  accuracyByType,
  unanswered,
  timeSpentSec,
  returnTo,
}: {
  test: ReadingTest;
  answers: Record<number, string>;
  rawScore: number;
  band: number;
  accuracyByType: Record<string, number>;
  unanswered: number;
  timeSpentSec: number;
  returnTo: string;
}) {
  return (
    <div className="min-h-screen safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-xl font-semibold mb-6">Reading results</h1>

        <Card className="mb-6 text-center py-8">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Estimated band</p>
          <p className="text-5xl font-bold" style={{ color: "var(--color-primary-2)" }}>
            {band.toFixed(1)}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            {rawScore}/{test.questions.length} correct · {Math.round((rawScore / test.questions.length) * 100)}% accuracy
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {Math.floor(timeSpentSec / 60)}m {timeSpentSec % 60}s · {unanswered} unanswered
          </p>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-3">Accuracy by question type</p>
          <div className="flex flex-col gap-2.5">
            {Object.entries(accuracyByType).map(([type, acc]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-muted)]">{type}</span>
                  <span className="font-medium">{Math.round(acc * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-band-track)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(acc * 100)}%`,
                      background: acc >= 0.7 ? "var(--color-success)" : acc >= 0.4 ? "var(--color-warning)" : "var(--color-danger)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-3">Question review</p>
          <div className="flex flex-col gap-2">
            {test.questions.map((q) => {
              const userAns = answers[q.number];
              const correct = Array.isArray(q.correctAnswer)
                ? q.correctAnswer.some((a) => a.toLowerCase().trim() === (userAns ?? "").toLowerCase().trim())
                : (userAns ?? "").toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
              return (
                <div key={q.number} className="flex items-start gap-2 text-xs py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: correct ? "var(--color-success)" : "var(--color-danger)",
                      color: "white",
                    }}
                  >
                    {q.number}
                  </span>
                  <div className="flex-1">
                    <p className="text-[var(--color-text)]">{q.prompt}</p>
                    <p className="text-[var(--color-text-muted)] mt-0.5">
                      Your answer: <span className={correct ? "" : "text-[var(--color-danger)]"}>{userAns || "—"}</span>
                      {!correct && (
                        <>
                          {" "}
                          · Correct: <span className="text-[var(--color-success)]">{Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Link href={returnTo}>
          <Button size="lg" className="w-full">
            Done
          </Button>
        </Link>
      </div>
    </div>
  );
}
