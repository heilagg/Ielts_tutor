"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMMSS } from "@/hooks/useCountdown";
import { useSpeechRecognition, isSpeechRecognitionSupported, type SpeechMetrics } from "@/hooks/useSpeechRecognition";
import type { SpeakingQuestionSet } from "@/lib/ai/schemas";

type Phase = "intro" | "part1" | "part2-prep" | "part2-speaking" | "part3" | "submitting" | "done";

interface Segment {
  transcript: string;
  durationSec: number;
  metrics: SpeechMetrics;
}

export function SpeakingRunner({ sessionId, questions, mode }: { sessionId: string; questions: SpeakingQuestionSet; mode: string }) {
  const router = useRouter();
  // Defaults to false to match SSR (the feature can't be detected server-side); the real
  // value is read after mount so server and client render the same thing on first paint.
  const [supported, setSupported] = useState(false);
  const { transcript, isRecording, start, stop } = useSpeechRecognition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser feature detection, unavailable during SSR
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const [phase, setPhase] = useState<Phase>("intro");
  const [part1Idx, setPart1Idx] = useState(0);
  const [part3Idx, setPart3Idx] = useState(0);
  const [part1Answers, setPart1Answers] = useState<Array<{ question: string; answer: string }>>([]);
  const [part2Answer, setPart2Answer] = useState<{ prompt: string; answer: string } | null>(null);
  const [part3Answers, setPart3Answers] = useState<Array<{ question: string; answer: string }>>([]);
  const [manualText, setManualText] = useState("");
  const segmentsRef = useRef<Segment[]>([]);
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [speakSeconds, setSpeakSeconds] = useState(120);

  useEffect(() => {
    if (phase !== "part2-prep") return;
    const t = setTimeout(() => {
      setPrepSeconds((s) => {
        if (s <= 1) {
          setPhase("part2-speaking");
          if (supported) start();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, prepSeconds, start, supported]);

  useEffect(() => {
    if (phase !== "part2-speaking") return;
    const t = setTimeout(() => {
      setSpeakSeconds((s) => {
        if (s <= 1) {
          finishPart2();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, speakSeconds]);

  function recordSegment() {
    const result = stop();
    segmentsRef.current.push({ transcript: result.transcript, durationSec: result.durationSec, metrics: result.metrics });
    return result.transcript;
  }

  function handlePart1Next() {
    const answer = supported ? recordSegment() : manualText;
    setPart1Answers((a) => [...a, { question: questions.part1.questions[part1Idx], answer }]);
    setManualText("");
    if (part1Idx + 1 < questions.part1.questions.length) {
      setPart1Idx((i) => i + 1);
    } else {
      setPhase("part2-prep");
      setPrepSeconds(60);
    }
  }

  function finishPart2() {
    const answer = supported ? recordSegment() : manualText;
    setPart2Answer({ prompt: questions.part2.prompt, answer });
    setManualText("");
    setSpeakSeconds(120);
    setPhase("part3");
  }

  function handlePart3Next() {
    const answer = supported ? recordSegment() : manualText;
    setPart3Answers((a) => [...a, { question: questions.part3.questions[part3Idx], answer }]);
    setManualText("");
    if (part3Idx + 1 < questions.part3.questions.length) {
      setPart3Idx((i) => i + 1);
    } else {
      submit(part1Answers, part2Answer, [...part3Answers, { question: questions.part3.questions[part3Idx], answer }]);
    }
  }

  async function submit(
    p1: Array<{ question: string; answer: string }>,
    p2: { prompt: string; answer: string } | null,
    p3: Array<{ question: string; answer: string }>
  ) {
    setPhase("submitting");
    const segs = segmentsRef.current;
    const totalDuration = segs.reduce((s, x) => s + x.durationSec, 0) || 1;
    const speechMetrics = supported
      ? {
          wordsPerMinute: Math.round(segs.reduce((s, x) => s + x.metrics.wordsPerMinute * x.durationSec, 0) / totalDuration),
          fillerCount: segs.reduce((s, x) => s + x.metrics.fillerCount, 0),
          longPauseCount: segs.reduce((s, x) => s + x.metrics.longPauseCount, 0),
          selfCorrections: segs.reduce((s, x) => s + x.metrics.selfCorrections, 0),
        }
      : { wordsPerMinute: 130, fillerCount: 0, longPauseCount: 0, selfCorrections: 0 };

    await fetch(`/api/speaking/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part1Transcript: p1.filter((x) => x.answer.trim()),
        part2Transcript: p2 ?? { prompt: questions.part2.prompt, answer: "" },
        part3Transcript: p3.filter((x) => x.answer.trim()),
        speechMetrics,
      }),
    });
    router.refresh();
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
        <h1 className="text-xl font-semibold mb-2">Speaking Test</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-2 max-w-sm">
          Part 1 (introduction), Part 2 (1 min prep + 2 min cue card talk), Part 3 (discussion). Speak
          naturally — you won&apos;t be interrupted or given hints during the test.
        </p>
        {!supported && (
          <p className="text-xs text-[var(--color-warning)] mb-4 max-w-sm">
            Speech recognition isn&apos;t available in this browser — you can type your answers instead.
          </p>
        )}
        <Button
          size="lg"
          onClick={() => {
            setPhase("part1");
            if (supported) start();
          }}
        >
          Begin Speaking Test
        </Button>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
        <p className="text-sm text-[var(--color-text-muted)]">Evaluating your speaking...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top">
        <p className="text-sm font-semibold">
          Speaking — {phase.startsWith("part1") ? "Part 1" : phase.startsWith("part2") ? "Part 2" : "Part 3"}{" "}
          {mode === "EXAM" ? "· Exam Mode" : "· Study Mode"}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        {phase === "part1" && (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">
              Question {part1Idx + 1} of {questions.part1.questions.length}
            </p>
            <p className="text-lg font-medium mb-8 max-w-md">{questions.part1.questions[part1Idx]}</p>
            <RecordControl supported={supported} isRecording={isRecording} transcript={transcript} manualText={manualText} setManualText={setManualText} onNext={handlePart1Next} start={start} />
          </>
        )}

        {phase === "part2-prep" && (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Preparation time</p>
            <p className="text-3xl font-bold tabular-nums mb-4">{formatMMSS(prepSeconds)}</p>
            <div className="max-w-md text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <p className="font-medium text-sm mb-2">{questions.part2.prompt}</p>
              <ul className="text-sm list-disc pl-4 flex flex-col gap-1">
                {questions.part2.bulletPoints.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {phase === "part2-speaking" && (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Speaking — {formatMMSS(speakSeconds)} remaining</p>
            <div className="max-w-md text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
              <p className="font-medium text-sm mb-2">{questions.part2.prompt}</p>
              <ul className="text-sm list-disc pl-4 flex flex-col gap-1">
                {questions.part2.bulletPoints.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            {supported ? (
              <div className="flex flex-col items-center gap-3">
                <MicIndicator isRecording={isRecording} />
                <Button variant="secondary" onClick={finishPart2}>
                  Finish early
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-md flex flex-col gap-3">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full min-h-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
                  placeholder="Type your answer..."
                />
                <Button onClick={finishPart2}>Submit answer</Button>
              </div>
            )}
          </>
        )}

        {phase === "part3" && (
          <>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">
              Question {part3Idx + 1} of {questions.part3.questions.length}
            </p>
            <p className="text-lg font-medium mb-8 max-w-md">{questions.part3.questions[part3Idx]}</p>
            <RecordControl supported={supported} isRecording={isRecording} transcript={transcript} manualText={manualText} setManualText={setManualText} onNext={handlePart3Next} start={start} />
          </>
        )}
      </div>
    </div>
  );
}

function MicIndicator({ isRecording }: { isRecording: boolean }) {
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center"
      style={{ background: isRecording ? "var(--color-danger)" : "var(--color-surface-2)" }}
    >
      <Mic size={26} color={isRecording ? "white" : "var(--color-text-muted)"} />
    </div>
  );
}

function RecordControl({
  supported,
  isRecording,
  transcript,
  manualText,
  setManualText,
  onNext,
  start,
}: {
  supported: boolean;
  isRecording: boolean;
  transcript: string;
  manualText: string;
  setManualText: (v: string) => void;
  onNext: () => void;
  start: () => boolean;
}) {
  if (!supported) {
    return (
      <div className="w-full max-w-md flex flex-col gap-3 items-stretch">
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          className="w-full min-h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
          placeholder="Type your answer..."
        />
        <Button onClick={onNext}>Next</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4">
      {!isRecording ? (
        <button
          onClick={start}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-primary)]"
          aria-label="Start speaking"
        >
          <Mic size={26} color="white" />
        </button>
      ) : (
        <button
          onClick={onNext}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-danger)]"
          aria-label="Stop and continue"
        >
          <Square size={22} color="white" />
        </button>
      )}
      {transcript && <p className="text-xs text-[var(--color-text-muted)] max-w-md">{transcript}</p>}
    </div>
  );
}
