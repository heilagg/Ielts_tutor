"use client";

import { useCallback, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): { 0: { transcript: string }; isFinal: boolean; length: number };
    [index: number]: { 0: { transcript: string }; isFinal: boolean; length: number };
  };
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface SpeechMetrics {
  wordsPerMinute: number;
  fillerCount: number;
  longPauseCount: number;
  selfCorrections: number;
}

const FILLER_REGEX = /\b(um+|uh+|erm+|like|you know|i mean|kind of|sort of)\b/gi;
const SELF_CORRECTION_REGEX = /\b(i mean|sorry|actually|no wait|what i mean is|rather)\b/gi;

export function computeMetrics(transcript: string, durationSec: number, resultTimestamps: number[]): SpeechMetrics {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordsPerMinute = durationSec > 0 ? Math.round((words.length / durationSec) * 60) : 0;
  const fillerCount = (transcript.match(FILLER_REGEX) ?? []).length;
  const selfCorrections = (transcript.match(SELF_CORRECTION_REGEX) ?? []).length;
  let longPauseCount = 0;
  for (let i = 1; i < resultTimestamps.length; i++) {
    if (resultTimestamps[i] - resultTimestamps[i - 1] > 2500) longPauseCount++;
  }
  return { wordsPerMinute, fillerCount, longPauseCount, selfCorrections };
}

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const timestampsRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    finalTranscriptRef.current = "";
    timestampsRef.current = [];
    startTimeRef.current = Date.now();
    setTranscript("");

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current += text + " ";
          timestampsRef.current.push(Date.now());
        } else {
          interim += text;
        }
      }
      setTranscript((finalTranscriptRef.current + interim).trim());
    };
    recognition.onerror = () => {};
    recognition.onend = () => {
      // iOS Safari sometimes ends recognition after a silence gap — restart if we're still "recording".
      if (recognitionRef.current === recognition && isRecording) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback((): { transcript: string; durationSec: number; metrics: SpeechMetrics } => {
    setIsRecording(false);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
    }
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const finalText = finalTranscriptRef.current.trim();
    const metrics = computeMetrics(finalText, durationSec, timestampsRef.current);
    return { transcript: finalText, durationSec, metrics };
  }, []);

  return { transcript, isRecording, start, stop };
}
