import Link from "next/link";
import { requireProfile } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ErrorList } from "@/components/errors/ErrorList";
import { Card } from "@/components/ui/Card";
import { Layers } from "lucide-react";

export default async function ErrorsPage() {
  const user = await requireProfile();
  const [errors, dueCount] = await Promise.all([
    prisma.errorEntry.findMany({
      where: { userId: user.id },
      orderBy: [{ frequency: "desc" }, { lastSeenAt: "desc" }],
    }),
    prisma.errorEntry.count({ where: { userId: user.id, dueAt: { lte: new Date() } } }),
  ]);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Error review</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Every recurring mistake from your Writing, Speaking, Reading, and Listening work, ranked by frequency.
      </p>

      <Link href="/errors/flashcards">
        <Card className="mb-6 flex items-center justify-between hover:brightness-95 transition-[filter]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-sm font-medium">Mistake flashcards</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {dueCount > 0 ? `${dueCount} card${dueCount === 1 ? "" : "s"} due for review` : "All caught up"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[var(--color-primary)]">Review →</span>
        </Card>
      </Link>

      <ErrorList
        initialErrors={errors.map((e) => ({
          id: e.id,
          skill: e.skill,
          category: e.category,
          original: e.original,
          corrected: e.corrected,
          explanation: e.explanation,
          severity: e.severity,
          frequency: e.frequency,
          masteryStatus: e.masteryStatus,
          lastSeenLabel: e.lastSeenAt.toLocaleDateString(),
        }))}
      />
    </div>
  );
}
