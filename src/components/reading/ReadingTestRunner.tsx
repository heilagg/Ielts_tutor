"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { useCountdown, formatMMSS } from "@/hooks/useCountdown";
import type { SanitizedReadingTest } from "@/lib/testSanitize";

export function ReadingTestRunner({
  attemptId,
  test,
  timeLimitMinutes,
  mode,
}: {
  attemptId: string;
  test: SanitizedReadingTest;
  timeLimitMinutes: number;
  mode: string;
}) {
  const router = useRouter();
  const storageKey = `reading-answers-${attemptId}`;
  // Initial state must match SSR output (localStorage doesn't exist server-side) — the
  // saved draft is loaded after mount in the effect below, then persisted on every change.
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activePassage, setActivePassage] = useState(0);
  const [mobileView, setMobileView] = useState<"passage" | "questions">("passage");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loading a draft from localStorage, unavailable during SSR
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const { remainingSeconds, elapsedSeconds } = useCountdown(timeLimitMinutes * 60, () => {
    void handleSubmit(true);
  });

  const questionsForPassage = useMemo(
    () => test.questions.filter((q) => q.passageIndex === activePassage),
    [test.questions, activePassage]
  );

  function setAnswer(number: number, value: string) {
    setAnswers((a) => ({ ...a, [number]: value }));
  }

  async function handleSubmit(auto = false) {
    if (submitting) return;
    const unanswered = test.questions.length - Object.values(answers).filter((v) => v && v.trim()).length;
    if (!auto && unanswered > 0) {
      const ok = confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
      if (!ok) return;
    }
    setSubmitting(true);
    await fetch(`/api/reading/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, timeSpentSec: elapsedSeconds() }),
    });
    localStorage.removeItem(storageKey);
    router.refresh();
  }

  const answeredCount = Object.values(answers).filter((v) => v && v.trim()).length;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top">
        <div>
          <p className="text-sm font-semibold">Reading {mode === "EXAM" ? "— Exam Mode" : "— Study Mode"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {answeredCount}/{test.questions.length} answered
          </p>
        </div>
        <div
          className={clsx(
            "tabular-nums font-semibold text-lg px-3 py-1 rounded-lg",
            remainingSeconds < 300 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
          )}
        >
          {formatMMSS(remainingSeconds)}
        </div>
      </header>

      <div className="flex gap-1 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
        {test.passages.map((p) => (
          <button
            key={p.index}
            onClick={() => setActivePassage(p.index)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
              activePassage === p.index ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            Passage {p.index + 1}
          </button>
        ))}
        <div className="ml-auto flex md:hidden gap-1">
          <button
            onClick={() => setMobileView("passage")}
            className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium", mobileView === "passage" ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-2)]")}
          >
            Passage
          </button>
          <button
            onClick={() => setMobileView("questions")}
            className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium", mobileView === "questions" ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-2)]")}
          >
            Questions
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid md:grid-cols-2">
        <div
          className={clsx(
            "overflow-y-auto p-5 border-r border-[var(--color-border)]",
            mobileView === "passage" ? "block" : "hidden md:block"
          )}
        >
          <h2 className="font-semibold text-base mb-3">{test.passages[activePassage].title}</h2>
          {test.passages[activePassage].paragraphs.map((p) => (
            <p key={p.label} className="text-sm leading-relaxed mb-4">
              <strong className="text-[var(--color-primary-2)]">{p.label}</strong> {p.text}
            </p>
          ))}
        </div>

        <div className={clsx("overflow-y-auto p-5", mobileView === "questions" ? "block" : "hidden md:block")}>
          <QuestionGroups questions={questionsForPassage} answers={answers} setAnswer={setAnswer} />
        </div>
      </div>

      <footer className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-bottom flex gap-2 overflow-x-auto">
        {test.questions.map((q) => (
          <button
            key={q.number}
            onClick={() => {
              setActivePassage(q.passageIndex);
              setMobileView("questions");
            }}
            className={clsx(
              "min-w-8 h-8 rounded-md text-xs font-medium shrink-0",
              answers[q.number]?.trim()
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            {q.number}
          </button>
        ))}
      </footer>
      <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <Button size="lg" className="w-full" onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Reading Test"}
        </Button>
      </div>
    </div>
  );
}

function QuestionGroups({
  questions,
  answers,
  setAnswer,
}: {
  questions: SanitizedReadingTest["questions"];
  answers: Record<number, string>;
  setAnswer: (n: number, v: string) => void;
}) {
  const groups: Array<{ groupType: string; groupInstructions: string; items: typeof questions }> = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (last && last.groupType === q.groupType && last.groupInstructions === q.groupInstructions) {
      last.items.push(q);
    } else {
      groups.push({ groupType: q.groupType, groupInstructions: q.groupInstructions, items: [q] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            Questions {g.items[0].number}
            {g.items.length > 1 ? `-${g.items[g.items.length - 1].number}` : ""}
          </p>
          <p className="text-sm mb-3">{g.groupInstructions}</p>
          <div className="flex flex-col gap-3">
            {g.items.map((q) => (
              <QuestionInput key={q.number} question={q} value={answers[q.number] ?? ""} onChange={(v) => setAnswer(q.number, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SanitizedReadingTest["questions"][number];
  value: string;
  onChange: (v: string) => void;
}) {
  const isTFNG = question.groupType === "True/False/Not Given" || question.groupType === "Yes/No/Not Given";
  const tfngOptions = question.groupType === "True/False/Not Given" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <p className="text-sm mb-2">
        <span className="font-medium">{question.number}.</span> {question.prompt}
      </p>
      {isTFNG ? (
        <div className="flex gap-2 flex-wrap">
          {tfngOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={clsx(
                "px-3 py-2 rounded-lg text-xs font-medium min-h-11",
                value === opt ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : question.options && question.options.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={clsx(
                "text-left px-3 py-2 rounded-lg text-xs min-h-11",
                value === opt ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
