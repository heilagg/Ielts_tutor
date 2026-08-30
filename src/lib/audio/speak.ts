"use client";

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

/** Best-effort voice assignment per named speaker — exact gender detection isn't reliably exposed
 * by the Web Speech API across browsers, so this is a heuristic based on common voice-name patterns. */
export function assignVoices(speakers: Array<{ speaker: string; voiceHint: "male" | "female" }>): Record<string, SpeechSynthesisVoice | null> {
  const voices = getEnglishVoices();
  const femaleHints = ["female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "susan", "zira", "aria"];
  const maleHints = ["male", "daniel", "alex", "fred", "oliver", "arthur", "james", "guy", "david"];

  const femaleVoices = voices.filter((v) => femaleHints.some((h) => v.name.toLowerCase().includes(h)));
  const maleVoices = voices.filter((v) => maleHints.some((h) => v.name.toLowerCase().includes(h)));
  const remaining = voices.filter((v) => !femaleVoices.includes(v) && !maleVoices.includes(v));

  const assignment: Record<string, SpeechSynthesisVoice | null> = {};
  let femaleIdx = 0;
  let maleIdx = 0;
  let remainingIdx = 0;
  for (const s of speakers) {
    if (s.voiceHint === "female") {
      assignment[s.speaker] = femaleVoices[femaleIdx % Math.max(femaleVoices.length, 1)] ?? remaining[remainingIdx++ % Math.max(remaining.length, 1)] ?? voices[0] ?? null;
      femaleIdx++;
    } else {
      assignment[s.speaker] = maleVoices[maleIdx % Math.max(maleVoices.length, 1)] ?? remaining[remainingIdx++ % Math.max(remaining.length, 1)] ?? voices[0] ?? null;
      maleIdx++;
    }
  }
  return assignment;
}

export function speakLine(text: string, voice: SpeechSynthesisVoice | null, rate = 0.97): Promise<void> {
  return new Promise((resolve) => {
    if (!text.trim()) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function cancelSpeech() {
  window.speechSynthesis.cancel();
}

export function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (window.speechSynthesis.getVoices().length > 0) return resolve();
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(resolve, 1500);
  });
}

export function parseScriptLines(script: string): Array<{ speaker: string; text: string }> {
  const lines = script.split("\n").filter((l) => l.trim());
  const parsed: Array<{ speaker: string; text: string }> = [];
  for (const line of lines) {
    const match = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (match) {
      parsed.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else {
      parsed.push({ speaker: "Narrator", text: line.trim() });
    }
  }
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export { sleep };
