"use client";

import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface VocabEntryData {
  id: string;
  word: string;
  definition: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  collocations: string | null;
  synonyms: string | null;
  antonyms: string | null;
  example: string | null;
  userExample: string | null;
  topic: string | null;
  mastery: string;
}

const MASTERY_OPTIONS = ["NEW", "LEARNING", "MASTERED"] as const;

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function VocabularyManager({ initialEntries }: { initialEntries: VocabEntryData[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [word, setWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");

  async function addWord() {
    if (!word.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim() }),
      });
      const data = await res.json();
      if (data.entry) setEntries((e) => [data.entry, ...e]);
      setWord("");
    } finally {
      setAdding(false);
    }
  }

  async function updateEntry(id: string, patch: Partial<{ userExample: string; mastery: string }>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    await fetch(`/api/vocabulary/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  const visible = filter === "ALL" ? entries : entries.filter((e) => e.mastery === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
          placeholder="Add a word or phrase..."
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm"
        />
        <Button onClick={addWord} disabled={adding || !word.trim()}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {["ALL", ...MASTERY_OPTIONS].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              filter === f ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-sm text-[var(--color-text-muted)]">
            No words yet. Add one above, or words will be suggested here as you review your writing feedback.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((e) => (
          <VocabCard key={e.id} entry={e} onUpdate={updateEntry} />
        ))}
      </div>
    </div>
  );
}

function VocabCard({
  entry,
  onUpdate,
}: {
  entry: VocabEntryData;
  onUpdate: (id: string, patch: Partial<{ userExample: string; mastery: string }>) => void;
}) {
  const [ownExample, setOwnExample] = useState(entry.userExample ?? "");
  const collocations = parseList(entry.collocations);
  const synonyms = parseList(entry.synonyms);

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm">
          {entry.word} {entry.partOfSpeech && <span className="text-xs text-[var(--color-text-muted)] font-normal">({entry.partOfSpeech})</span>}
        </p>
        {entry.pronunciation && <span className="text-xs text-[var(--color-text-muted)]">{entry.pronunciation}</span>}
      </div>
      {entry.definition ? (
        <p className="text-sm text-[var(--color-text-muted)] mb-2">{entry.definition}</p>
      ) : (
        <p className="text-xs text-[var(--color-warning)] mb-2">
          No AI definition available — configure ANTHROPIC_API_KEY, or add your own notes below.
        </p>
      )}
      {entry.example && <p className="text-xs italic text-[var(--color-text-muted)] mb-2">&ldquo;{entry.example}&rdquo;</p>}
      {collocations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {collocations.map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)]">
              {c}
            </span>
          ))}
        </div>
      )}
      {synonyms.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">Synonyms: {synonyms.join(", ")}</p>
      )}

      <textarea
        value={ownExample}
        onChange={(e) => setOwnExample(e.target.value)}
        onBlur={() => onUpdate(entry.id, { userExample: ownExample })}
        placeholder="Write your own example sentence..."
        className="w-full text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 mb-3"
        rows={2}
      />

      <div className="flex gap-1">
        {MASTERY_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => onUpdate(entry.id, { mastery: m })}
            className={clsx(
              "px-2 py-1 rounded-md text-[10px] font-medium",
              entry.mastery === m ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            )}
          >
            {m}
          </button>
        ))}
      </div>
    </Card>
  );
}
