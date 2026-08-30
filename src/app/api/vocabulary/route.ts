import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { generateVocabEntry } from "@/lib/ai/prompts/vocabulary";
import { AIUnavailableError } from "@/lib/ai/client";

const BodySchema = z.object({ word: z.string().min(1).max(80), topic: z.string().optional() });

export async function GET() {
  const user = await getOrCreateUser();
  const entries = await prisma.vocabularyEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { word, topic } = parsed.data;

  let content;
  let aiGenerated = true;
  try {
    content = await generateVocabEntry(word, topic, { userId: user.id });
  } catch (err) {
    if (err instanceof Error && err.name === "AiBudgetExceededError") {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (!(err instanceof AIUnavailableError)) console.error("Vocab generation failed:", err);
    aiGenerated = false;
    content = {
      definition: "",
      pronunciation: "",
      partOfSpeech: "",
      collocations: [],
      synonyms: [],
      antonyms: [],
      example: "",
    };
  }

  const entry = await prisma.vocabularyEntry.create({
    data: {
      userId: user.id,
      word,
      definition: content.definition,
      pronunciation: content.pronunciation,
      partOfSpeech: content.partOfSpeech,
      collocations: JSON.stringify(content.collocations),
      synonyms: JSON.stringify(content.synonyms),
      antonyms: JSON.stringify(content.antonyms),
      example: content.example,
      topic: topic ?? null,
    },
  });

  return NextResponse.json({ entry, aiGenerated });
}
