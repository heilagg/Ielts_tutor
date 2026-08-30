"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function StartTestButton({
  generateUrl,
  testUrlPrefix,
  body,
  label,
  loadingLabel,
  variant = "primary",
  size = "lg",
  className,
}: {
  generateUrl: string;
  testUrlPrefix: string;
  body: Record<string, unknown>;
  label: string;
  loadingLabel?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function start() {
    setLoading(true);
    setError(null);
    setElapsed(0);
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    try {
      const res = await fetch(generateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to generate test");
      const data = await res.json();
      router.push(`${testUrlPrefix}/${data.attemptId}`);
    } catch {
      setError("Couldn't generate the test — the AI service may be slow or unreachable right now. Please try again.");
      setLoading(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  return (
    <div>
      <Button
        variant={variant}
        size={size}
        onClick={start}
        disabled={loading}
        className={clsx(size === "lg" && "w-full", className)}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            {loadingLabel ?? "Generating..."} ({elapsed}s)
          </span>
        ) : (
          label
        )}
      </Button>
      {loading && elapsed >= 8 && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
          Full-length AI generation can take up to a minute or so — still working, not stuck.
        </p>
      )}
      {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
    </div>
  );
}
