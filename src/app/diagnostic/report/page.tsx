import Link from "next/link";
import { requireProfile } from "@/lib/guards";
import { buildDiagnosticReport } from "@/lib/diagnosticReport";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROADMAP } from "@/lib/curriculum";
import type { SkillKey } from "@/lib/adaptive";

const SKILL_LABEL: Record<SkillKey, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

export default async function DiagnosticReportPage() {
  const user = await requireProfile();
  const report = await buildDiagnosticReport(user.id);

  return (
    <div className="min-h-screen safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-semibold mb-1">Your diagnostic report</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          This is where your six-month plan starts. All bands below are AI-estimated, not official IELTS results.
        </p>

        <Card className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                <th className="text-left py-1.5">Skill</th>
                <th className="text-right py-1.5">Current</th>
                <th className="text-right py-1.5">Target</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(SKILL_LABEL) as SkillKey[]).map((skill) => (
                <tr key={skill} className="border-t border-[var(--color-border)]">
                  <td className="py-2">{SKILL_LABEL[skill]}</td>
                  <td className="py-2 text-right font-semibold">{report.bands[skill]?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 text-right text-[var(--color-text-muted)]">{report.targets[skill].toFixed(1)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-2 font-semibold">Overall</td>
                <td className="py-2 text-right font-bold text-[var(--color-primary-2)]">{report.overall?.toFixed(1) ?? "—"}</td>
                <td className="py-2 text-right text-[var(--color-text-muted)] font-semibold">{report.overallTarget.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Strongest skill</p>
            <p className="font-semibold">{report.strongestSkill ? SKILL_LABEL[report.strongestSkill] : "—"}</p>
          </Card>
          <Card>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Weakest skill</p>
            <p className="font-semibold">{report.weakestSkill ? SKILL_LABEL[report.weakestSkill] : "—"}</p>
          </Card>
        </div>

        {report.bottleneck && (
          <Card className="mb-6">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Biggest score bottleneck</p>
            <p className="font-semibold">
              {SKILL_LABEL[report.bottleneck.skill]} — {report.bottleneck.gap.toFixed(1)} band gap to target
            </p>
          </Card>
        )}

        {report.topWeaknesses.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-2">Top weaknesses</p>
            <ul className="text-sm flex flex-col gap-1.5 list-disc pl-4">
              {report.topWeaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Card>
        )}

        {report.topStrengths.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-2">Top strengths</p>
            <ul className="text-sm flex flex-col gap-1.5 list-disc pl-4">
              {report.topStrengths.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mb-6">
          <p className="font-medium text-sm mb-3">Skill profiles</p>
          <ProfileBlock title="Reading" data={report.readingProfile} />
          <ProfileBlock title="Listening" data={report.listeningProfile} />
          {report.writingProfile.task1 && <ProfileBlock title="Writing — Task 1" data={report.writingProfile.task1} />}
          {report.writingProfile.task2 && <ProfileBlock title="Writing — Task 2" data={report.writingProfile.task2} />}
          <ProfileBlock title="Speaking" data={report.speakingProfile} />
        </Card>

        {report.grammarProfile.length > 0 && (
          <Card className="mb-6">
            <p className="font-medium text-sm mb-2">Grammar profile</p>
            <div className="flex flex-wrap gap-2">
              {report.grammarProfile.map((g) => (
                <span key={g.category} className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-2)]">
                  {g.category} · {g.frequency}
                </span>
              ))}
            </div>
          </Card>
        )}

        <Card className="mb-6">
          <p className="font-medium text-sm mb-2">Vocabulary profile</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {report.vocabularyProfile.entriesTracked} words tracked so far.{" "}
            {report.vocabularyProfile.lexicalBandWriting != null &&
              `Writing lexical resource: Band ${report.vocabularyProfile.lexicalBandWriting.toFixed(1)}. `}
            {report.vocabularyProfile.lexicalBandSpeaking != null &&
              `Speaking lexical resource: Band ${report.vocabularyProfile.lexicalBandSpeaking.toFixed(1)}.`}
          </p>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-1">Recommended weekly workload</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            ~{report.recommendedWeeklyMinutes} minutes/week ({Math.round(report.recommendedWeeklyMinutes / 60)} hours), based on
            your available study days and time.
          </p>
        </Card>

        <Card className="mb-6">
          <p className="font-medium text-sm mb-3">Your six-month roadmap</p>
          <div className="flex flex-col gap-3">
            {ROADMAP.map((r) => (
              <div key={r.month} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {r.month}
                </div>
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Link href="/home">
          <Button size="lg" className="w-full">
            Go to your dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ProfileBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">{title}</p>
      <div className="flex flex-col gap-1.5">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-[var(--color-text-muted)]">{k}</span>
              <span className="font-medium">{v <= 1 ? `${Math.round(v * 100)}%` : v.toFixed(1)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-band-track)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${v <= 1 ? Math.round(v * 100) : Math.round((v / 9) * 100)}%`, background: "var(--color-primary-2)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
