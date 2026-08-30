import { requireProfile } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { VocabularyManager } from "@/components/vocabulary/VocabularyManager";

export default async function VocabularyPage() {
  const user = await requireProfile();
  const entries = await prisma.vocabularyEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Vocabulary</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Natural academic vocabulary and collocations — not showy Band 8 words you&apos;d never actually use.
      </p>
      <VocabularyManager initialEntries={entries} />
    </div>
  );
}
