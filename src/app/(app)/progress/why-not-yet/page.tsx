import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireDiagnosticComplete } from "@/lib/guards";
import { buildWhyNotYetAnalysis } from "@/lib/whyNotYet";
import { AiNarrativeButton } from "@/components/dashboard/AiNarrativeButton";
import { Card } from "@/components/ui/Card";
import type { SkillKey } from "@/lib/adaptive";

const SKILL_LABEL: Record<SkillKey, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

export default async function WhyNotYetPage() {
  const user = await requireDiagnosticComplete();
  const targets: Record<SkillKey, number> = {
    READING: user.profile.targetReading,
    LISTENING: user.profile.targetListening,
    WRITING: user.profile.targetWriting,
    SPEAKING: user.profile.targetSpeaking,
  };
  const analysis = await buildWhyNotYetAnalysis(user.id, targets, user.profile.targetOverall, user.profile.examDate);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <Link href="/home" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] mb-4">
        <ChevronLeft size={16} /> Home
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Why am I not {analysis.prediction.target.toFixed(1)} yet?</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        A direct, evidence-based breakdown of where you stand — not a guess.
      </p>

      <Card className="mb-4">
        <div className="flex items-end gap-3 mb-1">
          <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--color-primary-2)" }}>
            {analysis.prediction.currentEstimate.toFixed(1)}
          </span>
          <span className="text-sm text-[var(--color-text-muted)] mb-1">
            / {analysis.prediction.target.toFixed(1)} target · gap {Math.max(0, analysis.prediction.gap).toFixed(1)}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">AI estimate from your recent scores — not an official IELTS score.</p>
      </Card>

      <div className="mb-4">
        <AiNarrativeButton endpoint="/api/why-not-yet" />
      </div>

      <Card className="mb-4">
        <p className="font-medium text-sm mb-2">Biggest blockers</p>
        <ul className="flex flex-col gap-1.5 text-sm list-disc pl-4">
          {analysis.biggestBlockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <p className="text-xs font-medium text-[var(--color-success)] mb-2">Already sufficient</p>
          {analysis.sufficientSkills.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">None yet</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {analysis.sufficientSkills.map((s) => (
                <li key={s}>{SKILL_LABEL[s]}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <p className="text-xs font-medium text-[var(--color-warning)] mb-2">Below target</p>
          {analysis.belowTargetSkills.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">None</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {analysis.belowTargetSkills.map((s) => (
                <li key={s.skill}>
                  {SKILL_LABEL[s.skill]} <span className="text-[var(--color-text-muted)]">(-{s.gap.toFixed(1)})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mb-4">
        <p className="font-medium text-sm mb-2">Most important next steps</p>
        <ol className="flex flex-col gap-1.5 text-sm list-decimal pl-4">
          {analysis.nextSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Card>

      <Card>
        <p className="font-medium text-sm mb-2">Time estimate at current pace</p>
        <p className="text-sm text-[var(--color-text-muted)]">{analysis.paceNote}</p>
        {analysis.monthsAtCurrentPace != null && (
          <p className="text-2xl font-bold mt-2" style={{ color: "var(--color-primary-2)" }}>
            ~{analysis.monthsAtCurrentPace} month{analysis.monthsAtCurrentPace === 1 ? "" : "s"}
          </p>
        )}
      </Card>
    </div>
  );
}
