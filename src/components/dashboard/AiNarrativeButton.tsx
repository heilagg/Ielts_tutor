"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sparkles, Loader2 } from "lucide-react";

export function AiNarrativeButton({ endpoint }: { endpoint: string }) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchNarrative() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNarrative(data.narrative);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the explanation.");
    } finally {
      setLoading(false);
    }
  }

  if (narrative) {
    return (
      <Card className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-primary)] mb-2 font-semibold">
          AI coach — estimate, not an official IELTS score
        </p>
        <p className="text-sm whitespace-pre-line">{narrative}</p>
      </Card>
    );
  }

  return (
    <div>
      <Button variant="secondary" size="md" onClick={fetchNarrative} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </>
        ) : (
          <>
            <Sparkles size={14} /> Explain this in plain English
          </>
        )}
      </Button>
      {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
    </div>
  );
}
