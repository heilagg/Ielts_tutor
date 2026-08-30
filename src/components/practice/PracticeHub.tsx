"use client";

import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { StartTestButton } from "@/components/StartTestButton";
import { BookOpenText, Headphones, PenLine, Mic } from "lucide-react";

export function PracticeHub() {
  const [mode, setMode] = useState<"STUDY" | "EXAM">("STUDY");

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-[var(--color-surface-2)] p-1 rounded-xl">
        <button
          onClick={() => setMode("STUDY")}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-medium",
            mode === "STUDY" ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-muted)]"
          )}
        >
          Study Mode
        </button>
        <button
          onClick={() => setMode("EXAM")}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-medium",
            mode === "EXAM" ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-muted)]"
          )}
        >
          Exam Mode
        </button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        {mode === "STUDY"
          ? "Study Mode: take your time, review as you go."
          : "Exam Mode: strict timing, no hints — results revealed only at the end."}
      </p>

      <div className="flex flex-col gap-4">
        <SkillCard icon={BookOpenText} title="Reading" desc="A fresh practice set, weighted toward your weak question types.">
          <StartTestButton
            generateUrl="/api/reading/generate"
            testUrlPrefix="/test/reading"
            body={{ kind: "PRACTICE", mode, fullLength: mode === "EXAM" }}
            label="Start Reading practice"
            loadingLabel="Preparing your reading set..."
          />
        </SkillCard>

        <SkillCard icon={Headphones} title="Listening" desc="A fresh practice set, weighted toward your weak question types.">
          <StartTestButton
            generateUrl="/api/listening/generate"
            testUrlPrefix="/test/listening"
            body={{ kind: "PRACTICE", mode, fullLength: mode === "EXAM" }}
            label="Start Listening practice"
            loadingLabel="Preparing your listening set..."
          />
        </SkillCard>

        <SkillCard icon={PenLine} title="Writing" desc="Pick a task to practice.">
          <div className="flex flex-col gap-2">
            <StartTestButton
              generateUrl="/api/writing/generate"
              testUrlPrefix="/test/writing"
              body={{ kind: "PRACTICE", mode, taskType: "TASK1" }}
              label="Task 1"
              loadingLabel="Preparing Task 1..."
              variant="secondary"
            />
            <StartTestButton
              generateUrl="/api/writing/generate"
              testUrlPrefix="/test/writing"
              body={{ kind: "PRACTICE", mode, taskType: "TASK2" }}
              label="Task 2"
              loadingLabel="Preparing Task 2..."
              variant="secondary"
            />
          </div>
        </SkillCard>

        <SkillCard icon={Mic} title="Speaking" desc="Part 1, 2 (cue card) and 3, with a new topic each time.">
          <StartTestButton
            generateUrl="/api/speaking/generate"
            testUrlPrefix="/test/speaking"
            body={{ kind: "PRACTICE", mode }}
            label="Start Speaking practice"
            loadingLabel="Preparing your speaking questions..."
          />
        </SkillCard>
      </div>
    </div>
  );
}

function SkillCard({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--color-surface-2)]">
          <Icon size={18} className="text-[var(--color-text-muted)]" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}
