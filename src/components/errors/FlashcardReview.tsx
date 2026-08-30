"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SrsGrade } from "@/lib/srs";

export interface FlashcardData {
  id: string;
  skill: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
}

export function FlashcardReview({ cards }: { cards: FlashcardData[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const card = cards[index];

  async function grade(g: SrsGrade) {
    if (!card || submitting) return;
    setSubmitting(true);
    await fetch(`/api/errors/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    }).catch(() => {});
    setSubmitting(false);
    setDone((d) => d + 1);
    if (index + 1 >= cards.length) {
      router.refresh();
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  if (cards.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-[var(--color-text-muted)]">
          No cards are due right now. Come back later, or keep studying — new mistakes automatically
          become flashcards.
        </p>
      </Card>
    );
  }

  if (!card) {
    return (
      <Card className="text-center py-10">
        <p className="text-lg font-semibold mb-1">Session complete</p>
        <p className="text-sm text-[var(--color-text-muted)]">Reviewed {done} card{done === 1 ? "" : "s"}.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Card {index + 1} of {cards.length}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {card.skill} · {card.category}
        </p>
      </div>

      <Card className="min-h-48 flex flex-col justify-center">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          {revealed ? "Corrected" : "Your mistake"}
        </p>
        {!revealed ? (
          <p className="text-lg leading-snug">
            <span className="text-[var(--color-danger)]">✕</span> {card.original}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-lg leading-snug">
              <span className="text-[var(--color-success)]">✓</span> {card.corrected}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{card.explanation}</p>
          </div>
        )}
      </Card>

      <div className="mt-4">
        {!revealed ? (
          <Button variant="primary" size="lg" className="w-full" onClick={() => setRevealed(true)}>
            Show answer
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <Button variant="danger" size="md" disabled={submitting} onClick={() => grade("AGAIN")}>
              Again
            </Button>
            <Button variant="secondary" size="md" disabled={submitting} onClick={() => grade("HARD")}>
              Hard
            </Button>
            <Button variant="secondary" size="md" disabled={submitting} onClick={() => grade("GOOD")}>
              Good
            </Button>
            <Button variant="primary" size="md" disabled={submitting} onClick={() => grade("EASY")}>
              Easy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
