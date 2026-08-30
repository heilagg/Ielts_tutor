"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { formatMMSS } from "@/hooks/useCountdown";
import { Task1Visual } from "@/components/writing/Task1Visual";
import type { WritingTask1, WritingTask2 } from "@/lib/ai/schemas";

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function WritingEditor({
  submissionId,
  taskType,
  prompt,
  mode,
  initialText,
}: {
  submissionId: string;
  taskType: "TASK1" | "TASK2";
  prompt: WritingTask1 | WritingTask2;
  mode: string;
  initialText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [mobileView, setMobileView] = useState<"prompt" | "write">("prompt");
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [elapsed, setElapsed] = useState(0);
  const timeLimitSec = (taskType === "TASK1" ? 20 : 40) * 60;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = countWords(text);
  const targetWords = taskType === "TASK1" ? 150 : 250;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleTextChange(value: string) {
    setText(value);
    if (value !== initialText) setSaveState("saving");
  }

  useEffect(() => {
    if (text === initialText) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await fetch(`/api/writing/${submissionId}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayText: text, wordCount }),
      });
      setSaveState("saved");
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  async function handleSubmit() {
    if (submitting) return;
    if (wordCount < targetWords) {
      const ok = confirm(`Your response is ${wordCount} words, below the ${targetWords}-word minimum. Submit anyway?`);
      if (!ok) return;
    }
    setSubmitting(true);
    await fetch(`/api/writing/${submissionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essayText: text, wordCount, timeSpentSec: elapsed }),
    });
    router.refresh();
  }

  const overTime = elapsed > timeLimitSec;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top">
        <div>
          <p className="text-sm font-semibold">
            Writing {taskType === "TASK1" ? "Task 1" : "Task 2"} {mode === "EXAM" ? "— Exam Mode" : "— Study Mode"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {wordCount} words · target {targetWords}+ {saveState === "saving" ? "· saving..." : saveState === "saved" ? "· saved" : ""}
          </p>
        </div>
        <div className={clsx("tabular-nums font-semibold text-lg", overTime && "text-[var(--color-warning)]")}>
          {formatMMSS(elapsed)}
        </div>
      </header>

      <div className="flex md:hidden gap-1 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          onClick={() => setMobileView("prompt")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium",
            mobileView === "prompt" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
          )}
        >
          Task
        </button>
        <button
          onClick={() => setMobileView("write")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium",
            mobileView === "write" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
          )}
        >
          Write
        </button>
      </div>

      <div className="flex-1 overflow-hidden grid md:grid-cols-2">
        <div
          className={clsx(
            "p-5 md:border-r border-[var(--color-border)] overflow-y-auto h-full",
            mobileView === "prompt" ? "block" : "hidden md:block"
          )}
        >
          {taskType === "TASK1" ? (
            <>
              <p className="text-sm leading-relaxed mb-4">{(prompt as WritingTask1).prompt}</p>
              <Task1Visual task={prompt as WritingTask1} />
            </>
          ) : (
            <p className="text-sm leading-relaxed">{(prompt as WritingTask2).prompt}</p>
          )}
        </div>
        <div className={clsx("p-5 flex flex-col h-full", mobileView === "write" ? "flex" : "hidden md:flex")}>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start writing here..."
            className="flex-1 min-h-[300px] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-relaxed focus:outline-none focus:border-[var(--color-primary)]"
            autoFocus
          />
        </div>
      </div>

      <footer className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-bottom">
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={submitting || wordCount === 0}>
          {submitting ? "Evaluating your writing..." : "Submit for evaluation"}
        </Button>
      </footer>
    </div>
  );
}
