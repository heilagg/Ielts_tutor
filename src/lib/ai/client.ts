import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { MODEL_BY_TIER, estimateCostUsd, type ModelTier } from "@/lib/ai/models";
import { assertWithinAiBudget } from "@/lib/ai/budget";

export class AIUnavailableError extends Error {
  constructor(message = "ANTHROPIC_API_KEY is not configured.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIUnavailableError();
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface CallParams {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Model tier to route to (section 62). Defaults to BALANCED. */
  tier?: ModelTier;
  /** Short feature name for usage logging/cost breakdown, e.g. "writing_evaluate". */
  feature?: string;
  /** When provided, usage is logged and checked against that user's AI budget. */
  userId?: string;
}

async function callClaudeRaw(params: CallParams): Promise<{ text: string; truncated: boolean }> {
  const tier = params.tier ?? "BALANCED";
  const model = MODEL_BY_TIER[tier];

  if (params.userId) await assertWithinAiBudget(params.userId);

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature ?? 0.7,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });

  if (params.userId) {
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    prisma.aiUsageLog
      .create({
        data: {
          userId: params.userId,
          feature: params.feature ?? "unspecified",
          tier,
          model,
          inputTokens,
          outputTokens,
          estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
        },
      })
      .catch((err) => console.warn("Failed to log AI usage (non-fatal):", err));
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content.");
  }
  return { text: block.text, truncated: response.stop_reason === "max_tokens" };
}

/**
 * Calls Claude with a system prompt + user prompt and returns the raw text response.
 * Throws AIUnavailableError if no API key is configured — callers should catch this
 * and fall back to deterministic template content (see src/lib/ai/fallback.ts).
 */
export async function callClaude(params: CallParams): Promise<string> {
  const { text } = await callClaudeRaw(params);
  return text;
}

function parseJSONLoose<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Claude response was not valid JSON.");
  }
}

/**
 * Calls Claude and parses the response as JSON. Instructs the model to return
 * only JSON; strips markdown code fences defensively if present.
 *
 * Large structured generations (a full 40-question test) occasionally get cut off by
 * the token limit mid-JSON, which breaks parsing. When that happens this retries once
 * with a higher token budget before giving up — a silent fallback to much smaller
 * sample content is a worse outcome than one extra ~20s round trip.
 */
export async function callClaudeJSON<T = unknown>(params: CallParams): Promise<T> {
  const systemWithJsonInstruction = `${params.system}\n\nRespond with ONLY valid JSON. No markdown code fences, no commentary before or after the JSON.`;
  const baseMaxTokens = params.maxTokens ?? 4096;

  const attempt = async (maxTokens: number) => {
    const { text, truncated } = await callClaudeRaw({ ...params, system: systemWithJsonInstruction, maxTokens });
    if (truncated) throw new Error("Claude response was truncated by the token limit.");
    return parseJSONLoose<T>(text);
  };

  try {
    return await attempt(baseMaxTokens);
  } catch (err) {
    if (err instanceof AIUnavailableError) throw err;
    if (err instanceof Error && err.name === "AiBudgetExceededError") throw err;
    console.warn("callClaudeJSON: first attempt failed, retrying with a larger token budget:", err instanceof Error ? err.message : err);
    return attempt(Math.round(baseMaxTokens * 1.5));
  }
}
