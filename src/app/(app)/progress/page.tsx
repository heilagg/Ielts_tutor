import Link from "next/link";
import { requireDiagnosticComplete } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ScoreLineChart } from "@/components/charts/ScoreLineChart";
import { Card } from "@/components/ui/Card";
import { detectAllPlateaus } from "@/lib/scoring/plateau";
import type { SkillKey } from "@/lib/adaptive";
import { HelpCircle, TrendingUp } from "lucide-react";

const SKILLS: Array<{ key: SkillKey | "OVERALL"; label: string }> = [
  { key: "OVERALL", label: "Overall" },
  { key: "READING", label: "Reading" },
  { key: "LISTENING", label: "Listening" },
  { key: "WRITING", label: "Writing" },
  { key: "SPEAKING", label: "Speaking" },
];

export default async function ProgressPage() {
  const user = await requireDiagnosticComplete();
  const targets: Record<string, number> = {
    OVERALL: user.profile.targetOverall,
    READING: user.profile.targetReading,
    LISTENING: user.profile.targetListening,
    WRITING: user.profile.targetWriting,
    SPEAKING: user.profile.targetSpeaking,
  };

  const [allHistory, plateaus] = await Promise.all([
    prisma.scoreHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    detectAllPlateaus(user.id),
  ]);
  const plateauBySkill = Object.fromEntries(plateaus.map((p) => [p.skill, p]));

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-4">Progress</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/progress/why-not-yet">
          <Card className="hover:brightness-95 transition-[filter]">
            <HelpCircle size={16} className="text-[var(--color-primary)] mb-1" />
            <p className="text-xs font-medium">Why not target yet?</p>
          </Card>
        </Link>
        <Link href="/progress/reports">
          <Card className="hover:brightness-95 transition-[filter]">
            <TrendingUp size={16} className="text-[var(--color-primary)] mb-1" />
            <p className="text-xs font-medium">Weekly &amp; monthly reports</p>
          </Card>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {SKILLS.map(({ key, label }) => {
          const rows = allHistory.filter((r) => r.skill === key);
          const data = rows.map((r) => ({ date: r.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }), band: r.band }));
          const bands = rows.map((r) => r.band);
          const current = bands.length ? bands[bands.length - 1] : null;
          const best = bands.length ? Math.max(...bands) : null;
          const recentAvg = bands.length ? Math.round((bands.slice(-5).reduce((a, b) => a + b, 0) / bands.slice(-5).length) * 100) / 100 : null;
          const plateau = key !== "OVERALL" ? plateauBySkill[key] : undefined;

          return (
            <Card key={key}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{label}</p>
                <span className="text-xs text-[var(--color-text-muted)]">Target {targets[key].toFixed(1)}</span>
              </div>
              <ScoreLineChart data={data} target={targets[key]} />
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <StatBox label="Current" value={current} />
                <StatBox label="Best" value={best} />
                <StatBox label="Recent avg" value={recentAvg} />
              </div>
              {plateau?.isPlateaued && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-warning)] mb-1">
                    Plateaued around Band {plateau.plateauBand?.toFixed(1)} since {plateau.sinceDate?.toLocaleDateString()}
                  </p>
                  <ul className="text-xs text-[var(--color-text-muted)] list-disc pl-4 space-y-0.5">
                    {plateau.likelyCauses.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value != null ? value.toFixed(1) : "—"}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
    </div>
  );
}
