import Link from "next/link";
import { requireProfile } from "@/lib/guards";
import { getDiagnosticStatus } from "@/lib/diagnosticStatus";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StartTestButton } from "@/components/StartTestButton";
import { BookOpenText, Headphones, PenLine, Mic } from "lucide-react";

export default async function DiagnosticPage() {
  const user = await requireProfile();
  const status = await getDiagnosticStatus(user.id);

  return (
    <div className="min-h-screen safe-top safe-bottom">
      <div className="max-w-lg mx-auto px-5 py-8">
        <h1 className="text-2xl font-semibold mb-1">Initial diagnostic</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Before we build your six-month plan, we need to see where you&apos;re starting from. This simulates
          all four IELTS Academic components as closely as possible — answer as you would in the real exam.
        </p>

        <div className="flex flex-col gap-4">
          <DiagCard
            icon={BookOpenText}
            title="Reading"
            desc="3 passages · 40 questions · 60 minutes"
            done={status.reading.done}
            band={status.reading.band}
          >
            {!status.reading.done && (
              <StartTestButton
                generateUrl="/api/reading/generate"
                testUrlPrefix="/test/reading"
                body={{ kind: "DIAGNOSTIC", mode: "EXAM", fullLength: true }}
                label="Start Reading diagnostic"
                loadingLabel="Preparing your reading test..."
              />
            )}
          </DiagCard>

          <DiagCard
            icon={Headphones}
            title="Listening"
            desc="4 sections · 40 questions · ~30 minutes"
            done={status.listening.done}
            band={status.listening.band}
          >
            {!status.listening.done && (
              <StartTestButton
                generateUrl="/api/listening/generate"
                testUrlPrefix="/test/listening"
                body={{ kind: "DIAGNOSTIC", mode: "EXAM", fullLength: true }}
                label="Start Listening diagnostic"
                loadingLabel="Preparing your listening test..."
              />
            )}
          </DiagCard>

          <DiagCard
            icon={PenLine}
            title="Writing"
            desc="Task 1 (150+ words) · Task 2 (250+ words)"
            done={status.writingTask1.done && status.writingTask2.done}
            band={
              status.writingTask1.band != null && status.writingTask2.band != null
                ? Math.round(((status.writingTask1.band + status.writingTask2.band) / 2) * 2) / 2
                : null
            }
          >
            {!status.writingTask1.done && (
              <StartTestButton
                generateUrl="/api/writing/generate"
                testUrlPrefix="/test/writing"
                body={{ kind: "DIAGNOSTIC", mode: "EXAM", taskType: "TASK1" }}
                label="Start Writing Task 1"
                loadingLabel="Preparing your Task 1 prompt..."
              />
            )}
            {status.writingTask1.done && !status.writingTask2.done && (
              <StartTestButton
                generateUrl="/api/writing/generate"
                testUrlPrefix="/test/writing"
                body={{ kind: "DIAGNOSTIC", mode: "EXAM", taskType: "TASK2" }}
                label="Start Writing Task 2"
                loadingLabel="Preparing your Task 2 prompt..."
              />
            )}
          </DiagCard>

          <DiagCard
            icon={Mic}
            title="Speaking"
            desc="Part 1, 2 (cue card), 3 · ~11-14 minutes"
            done={status.speaking.done}
            band={status.speaking.band}
          >
            {!status.speaking.done && (
              <StartTestButton
                generateUrl="/api/speaking/generate"
                testUrlPrefix="/test/speaking"
                body={{ kind: "DIAGNOSTIC", mode: "EXAM" }}
                label="Start Speaking diagnostic"
                loadingLabel="Preparing your speaking test..."
              />
            )}
          </DiagCard>
        </div>

        {status.allComplete ? (
          <Link href="/diagnostic/report" className="block mt-6">
            <Button size="lg" className="w-full">
              View your diagnostic report
            </Button>
          </Link>
        ) : (
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
            Complete all four components to unlock your personalized six-month plan.
          </p>
        )}
      </div>
    </div>
  );
}

function DiagCard({
  icon: Icon,
  title,
  desc,
  done,
  band,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  done: boolean;
  band: number | null;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: done ? "var(--color-success)" : "var(--color-surface-2)" }}
        >
          <Icon size={18} className={done ? "text-white" : "text-[var(--color-text-muted)]"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{title}</p>
            {done && band != null && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-2)]">
                Band {band.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">{desc}</p>
          {!done && children}
          {done && <p className="text-xs text-[var(--color-success)] font-medium">Complete</p>}
        </div>
      </div>
    </Card>
  );
}
