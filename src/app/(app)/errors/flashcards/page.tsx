import Link from "next/link";
import { requireProfile } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { FlashcardReview } from "@/components/errors/FlashcardReview";
import { ChevronLeft } from "lucide-react";

export default async function FlashcardsPage() {
  const user = await requireProfile();
  const due = await prisma.errorEntry.findMany({
    where: { userId: user.id, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: 20,
  });

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <Link href="/errors" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] mb-4">
        <ChevronLeft size={16} /> Error review
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Mistake flashcards</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Spaced repetition (SM-2): cards you get wrong come back soon; cards you get right consistently
        come back less often, until they&apos;re marked mastered.
      </p>
      <FlashcardReview
        cards={due.map((e) => ({
          id: e.id,
          skill: e.skill,
          category: e.category,
          original: e.original,
          corrected: e.corrected,
          explanation: e.explanation,
        }))}
      />
    </div>
  );
}
