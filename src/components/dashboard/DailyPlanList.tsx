import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StartTestButton } from "@/components/StartTestButton";
import { BookOpenText, Headphones, PenLine, Mic, AlertTriangle } from "lucide-react";

interface PlanTask {
  id: string;
  skill: string;
  title: string;
  purpose: string;
  difficulty: string;
  payload: string;
}

export interface SimplePlanTask {
  skill: string;
  title: string;
  purpose: string;
  estMinutes: number;
}

const SKILL_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  READING: BookOpenText,
  LISTENING: Headphones,
  WRITING: PenLine,
  SPEAKING: Mic,
  GRAMMAR: AlertTriangle,
};

export function DailyPlanList({ tasks, rationale }: { tasks: PlanTask[]; rationale: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Today&apos;s plan</h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">{rationale}</p>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
          const estMinutes = (() => {
            try {
              return JSON.parse(task.payload).estMinutes as number;
            } catch {
              return null;
            }
          })();
          return <PlanTaskCard key={task.id} task={{ skill: task.skill, title: task.title, purpose: task.purpose, estMinutes: estMinutes ?? 0 }} />;
        })}
      </div>
    </div>
  );
}

/** Renders one plan task card + its "Start" action. Used by both the persisted daily plan and ad-hoc quick sessions. */
export function PlanTaskCard({ task }: { task: SimplePlanTask }) {
  const Icon = SKILL_ICON[task.skill] ?? BookOpenText;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--color-surface-2)]">
          <Icon size={16} className="text-[var(--color-text-muted)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">{task.title}</p>
            {task.estMinutes > 0 && <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">~{task.estMinutes} min</span>}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">{task.purpose}</p>
          <TaskAction task={task} />
        </div>
      </div>
    </Card>
  );
}

function TaskAction({ task }: { task: SimplePlanTask }) {
  if (task.skill === "READING") {
    return (
      <StartTestButton
        generateUrl="/api/reading/generate"
        testUrlPrefix="/test/reading"
        body={{ kind: "PRACTICE", mode: "STUDY", fullLength: false }}
        label="Start"
        loadingLabel="Preparing..."
        size="sm"
      />
    );
  }
  if (task.skill === "LISTENING") {
    return (
      <StartTestButton
        generateUrl="/api/listening/generate"
        testUrlPrefix="/test/listening"
        body={{ kind: "PRACTICE", mode: "STUDY", fullLength: false }}
        label="Start"
        loadingLabel="Preparing..."
        size="sm"
      />
    );
  }
  if (task.skill === "WRITING") {
    const taskType = task.title.includes("Task 1") ? "TASK1" : "TASK2";
    return (
      <StartTestButton
        generateUrl="/api/writing/generate"
        testUrlPrefix="/test/writing"
        body={{ kind: "PRACTICE", mode: "STUDY", taskType }}
        label="Start"
        loadingLabel="Preparing..."
        size="sm"
      />
    );
  }
  if (task.skill === "SPEAKING") {
    return (
      <StartTestButton
        generateUrl="/api/speaking/generate"
        testUrlPrefix="/test/speaking"
        body={{ kind: "PRACTICE", mode: "STUDY" }}
        label="Start"
        loadingLabel="Preparing..."
        size="sm"
      />
    );
  }
  return (
    <Link href="/errors" className="text-xs font-medium text-[var(--color-primary-2)]">
      Review in Errors →
    </Link>
  );
}
