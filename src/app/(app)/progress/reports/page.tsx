import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireDiagnosticComplete } from "@/lib/guards";
import { getOrCreateWeeklyReport, getOrCreateMonthlyReport, getPastWeeklyReports, getPastMonthlyReports, type PeriodReportData } from "@/lib/reports";
import { AiNarrativeButton } from "@/components/dashboard/AiNarrativeButton";
import { Card } from "@/components/ui/Card";

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function ReportsPage() {
  const user = await requireDiagnosticComplete();
  const [weekly, monthly, pastWeekly, pastMonthly] = await Promise.all([
    getOrCreateWeeklyReport(user.id),
    getOrCreateMonthlyReport(user.id),
    getPastWeeklyReports(user.id, 6),
    getPastMonthlyReports(user.id, 6),
  ]);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <Link href="/progress" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] mb-4">
        <ChevronLeft size={16} /> Progress
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Reports</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Weekly and monthly check-ins on what actually moved.</p>

      <ReportSection
        title={`This week (${fmt(weekly.data.periodStart)} – ${fmt(new Date(weekly.data.periodEnd.getTime() - 86_400_000))})`}
        data={weekly.data}
        isFinal={weekly.isFinal}
        narrativeEndpoint="/api/reports/weekly/narrative"
      />

      <ReportSection
        title={`This month (${monthly.data.periodStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })})`}
        data={monthly.data}
        isFinal={monthly.isFinal}
        narrativeEndpoint="/api/reports/monthly/narrative"
      />

      {pastWeekly.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Past weeks</p>
          <div className="flex flex-col gap-2">
            {pastWeekly.map(({ record, data }) => (
              <Card key={record.id} className="py-3">
                <div className="flex justify-between text-xs">
                  <span>{fmt(record.weekStart)}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {data.tasksCompleted} tasks · {data.studyMinutes}min
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastMonthly.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Past months</p>
          <div className="flex flex-col gap-2">
            {pastMonthly.map(({ record, data }) => (
              <Card key={record.id} className="py-3">
                <div className="flex justify-between text-xs">
                  <span>{record.monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {data.tasksCompleted} tasks · {data.studyMinutes}min
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title,
  data,
  isFinal,
  narrativeEndpoint,
}: {
  title: string;
  data: PeriodReportData;
  isFinal: boolean;
  narrativeEndpoint: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-sm">{title}</p>
        {!isFinal && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">in progress</span>}
      </div>

      <Card className="mb-3">
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <StatBox label="Study time" value={`${data.studyMinutes}m`} />
          <StatBox label="Tasks" value={String(data.tasksCompleted)} />
          <StatBox label="Vocab added" value={String(data.vocabularyLearned)} />
        </div>
        <div className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1">
          <p>Mistakes corrected: {data.errorsCorrected} · New mistakes logged: {data.newErrorsLogged}</p>
          {data.improved.length > 0 && <p className="text-[var(--color-success)]">Improved: {data.improved.join(", ")}</p>}
          {data.notImproved.length > 0 && <p className="text-[var(--color-warning)]">Did not improve: {data.notImproved.join(", ")}</p>}
        </div>
      </Card>

      <Card className="mb-3">
        <p className="text-xs font-medium mb-1">Biggest problem</p>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">{data.biggestProblem}</p>
        <p className="text-xs font-medium mb-1">Next focus</p>
        <p className="text-sm text-[var(--color-text-muted)]">{data.nextFocus}</p>
      </Card>

      <AiNarrativeButton endpoint={narrativeEndpoint} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
    </div>
  );
}
