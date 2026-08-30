/**
 * Configurable AI model routing (spec section 62): different tasks get routed to a
 * different model tier so that expensive, high-stakes evaluation uses the strongest
 * model while cheap/simple operations don't pay for it.
 *
 * All three tiers default to the same base model so the app works unmodified out of
 * the box — set the *_STRONG / *_BALANCED / *_FAST env vars to actually split cost
 * vs. quality across tiers once you know which models your API key can access.
 */
export type ModelTier = "STRONG" | "BALANCED" | "FAST";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export const MODEL_BY_TIER: Record<ModelTier, string> = {
  STRONG: process.env.ANTHROPIC_MODEL_STRONG || DEFAULT_MODEL,
  BALANCED: process.env.ANTHROPIC_MODEL_BALANCED || DEFAULT_MODEL,
  FAST: process.env.ANTHROPIC_MODEL_FAST || DEFAULT_MODEL,
};

/**
 * Approximate published per-million-token USD pricing, used only to produce an
 * in-app cost *estimate* for the user's own awareness (section 63) — not a billing
 * source of truth. Anthropic's actual pricing may differ or change; update the table
 * if you pin specific model versions.
 */
const PRICE_TABLE: Array<{ match: RegExp; inputPerM: number; outputPerM: number }> = [
  { match: /opus/i, inputPerM: 15, outputPerM: 75 },
  { match: /haiku/i, inputPerM: 0.8, outputPerM: 4 },
  { match: /sonnet/i, inputPerM: 3, outputPerM: 15 },
];
const DEFAULT_PRICE = { inputPerM: 3, outputPerM: 15 };

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_TABLE.find((p) => p.match.test(model)) ?? DEFAULT_PRICE;
  return (inputTokens / 1_000_000) * price.inputPerM + (outputTokens / 1_000_000) * price.outputPerM;
}
