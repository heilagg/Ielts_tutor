import { z } from "zod";
import { callClaudeJSON } from "@/lib/ai/client";

export const VocabEntrySchema = z.object({
  definition: z.string(),
  pronunciation: z.string(),
  partOfSpeech: z.string(),
  collocations: z.array(z.string()),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  example: z.string(),
});
export type VocabEntryContent = z.infer<typeof VocabEntrySchema>;

export async function generateVocabEntry(word: string, topic?: string, opts: { userId?: string } = {}): Promise<VocabEntryContent> {
  const system = `You are building a personal vocabulary entry for an IELTS Academic student. Prioritize NATURAL academic usage over rare/showy "Band 9" words — the goal is vocabulary the student can actually use correctly under exam pressure. Give real, commonly-used collocations (not invented ones).`;
  const user = `Word or phrase: "${word}"${topic ? ` (topic context: ${topic})` : ""}

Return JSON exactly as:
{ "definition": "concise, clear definition", "pronunciation": "IPA or simple phonetic respelling", "partOfSpeech": "e.g. noun, verb, adjective", "collocations": ["3-5 natural collocations"], "synonyms": ["2-4 near-synonyms suitable for academic writing"], "antonyms": ["0-3 antonyms if natural ones exist, else empty array"], "example": "one natural example sentence in an academic/IELTS-relevant context" }`;
  return callClaudeJSON<VocabEntryContent>({
    system,
    user,
    maxTokens: 600,
    temperature: 0.5,
    tier: "FAST",
    feature: "vocab_generate",
    userId: opts.userId,
  }).then((raw) => VocabEntrySchema.parse(raw));
}
