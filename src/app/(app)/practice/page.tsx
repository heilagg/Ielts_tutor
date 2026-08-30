import { requireDiagnosticComplete } from "@/lib/guards";
import { PracticeHub } from "@/components/practice/PracticeHub";

export default async function PracticePage() {
  await requireDiagnosticComplete();
  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Practice</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Every practice set is generated fresh and automatically weighted toward your current weaknesses.
      </p>
      <PracticeHub />
    </div>
  );
}
