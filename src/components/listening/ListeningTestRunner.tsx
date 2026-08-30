"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { formatMMSS } from "@/hooks/useCountdown";
import { assignVoices, parseScriptLines, speakLine, waitForVoices, sleep, cancelSpeech } from "@/lib/audio/speak";
import type { SanitizedListeningTest } from "@/lib/testSanitize";

type Phase = "idle" | "playing" | "reviewing" | "submitting";

export function ListeningTestRunner({
  attemptId,
  test,
  mode,
}: {
  attemptId: string;
  test: SanitizedListeningTest;
  mode: string;
}) {
  const router = useRouter();
  const storageKey = `listening-answers-${attemptId}`;
  // Initial state must match SSR output (localStorage doesn't exist server-side) — the
  // saved draft is loaded after mount in the effect below, then persisted on every change.
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [playingSection, setPlayingSection] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

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

  useEffect(() => {
    if (phase === "idle") return;
    const interval = setInterval(() => {
      if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => () => cancelSpeech(), []);

  function setAnswer(number: number, value: string) {
    setAnswers((a) => ({ ...a, [number]: value }));
  }

  async function startTest() {
    setPhase("playing");
    startTimeRef.current = Date.now();
    await waitForVoices();

    for (const section of test.sections) {
      setPlayingSection(section.index);
      setActiveTab(section.index);
      const lines = parseScriptLines(section.script ?? "");
      const voiceMap = assignVoices(section.speakerVoices);
      for (const line of lines) {
        await speakLine(line.text, voiceMap[line.speaker] ?? null);
        await sleep(250);
      }
      // Simulated "check your answers" pause between sections, as in the real exam.
      await sleep(4000);
    }
    setPlayingSection(null);
    setPhase("reviewing");
  }

  async function handleSubmit() {
    setPhase("submitting");
    cancelSpeech();
    await fetch(`/api/listening/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, timeSpentSec: elapsed }),
    });
    localStorage.removeItem(storageKey);
    router.refresh();
  }

  const answeredCount = Object.values(answers).filter((v) => v && v.trim()).length;
  const questionsForTab = test.questions.filter((q) => q.sectionIndex === activeTab);

  if (phase === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
        <h1 className="text-xl font-semibold mb-2">{test.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm">
          You will hear 4 recordings once, played automatically one after another. Use headphones if
          possible. You can read ahead in the questions for each section, but the transcript stays hidden
          until you finish.
        </p>
        <Button size="lg" onClick={startTest}>
          Start Listening Test
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top">
        <div>
          <p className="text-sm font-semibold">Listening {mode === "EXAM" ? "— Exam Mode" : "— Study Mode"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {phase === "playing" ? `Playing Section ${(playingSection ?? 0) + 1}...` : phase === "reviewing" ? "Audio finished — review your answers" : "Submitting..."}
          </p>
        </div>
        <div className="tabular-nums font-semibold text-lg">{formatMMSS(elapsed)}</div>
      </header>

      <div className="flex gap-1 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
        {test.sections.map((s) => (
          <button
            key={s.index}
            onClick={() => setActiveTab(s.index)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5",
              activeTab === s.index ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            {playingSection === s.index && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            Section {s.index + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{test.sections[activeTab].context}</p>
        <div className="flex flex-col gap-3">
          {questionsForTab.map((q) => (
            <QuestionInput key={q.number} question={q} value={answers[q.number] ?? ""} onChange={(v) => setAnswer(q.number, v)} />
          ))}
        </div>
      </div>

      <footer className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-bottom">
        <p className="text-xs text-[var(--color-text-muted)] text-center mb-2">
          {answeredCount}/{test.questions.length} answered
        </p>
        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={phase === "playing" || phase === "submitting"}
        >
          {phase === "playing" ? "Listening in progress..." : phase === "submitting" ? "Submitting..." : "Submit Listening Test"}
        </Button>
      </footer>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SanitizedListeningTest["questions"][number];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
        {question.groupType} — {question.groupInstructions}
      </p>
      <p className="text-sm mb-2">
        <span className="font-medium">{question.number}.</span> {question.prompt}
      </p>
      {question.options && question.options.length > 0 ? (
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
