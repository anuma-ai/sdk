/**
 * Curated list of active Anuma models to exercise slide-generation tests
 * against. Mirrors the `active: true` entries in Anuma's `VISION_MODELS`
 * config at the time of writing.
 *
 * The groupings below reflect what was observed when we last ran the
 * `prompt-home-gardening` prompt end-to-end. They're a starting point for
 * triage, not a contract — upstream stability and portal defaults shift
 * regularly, so re-run before trusting a label.
 *
 * Typical usage:
 *
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").ALL_MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 */

/** Models that generated a valid, non-trivial deck end-to-end. */
export const PASSING_MODELS = [
  "fireworks/accounts/fireworks/models/kimi-k2p5",
  "openai/gpt-5.4",
  "openai/gpt-5.2",
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "grok/grok-4-1-fast-reasoning",
  "grok/grok-4-1-fast-non-reasoning",
  "cerebras/qwen-3-235b-a22b-instruct-2507",
  "fireworks/accounts/fireworks/models/glm-5",
  "cerebras/zai-glm-4.7",
  "fireworks/accounts/fireworks/models/deepseek-v3p2",
] as const;

/** Deck was generated but with shape/validity issues (null theme, broken JSON). */
export const PARTIAL_MODELS = [
  "fireworks/accounts/fireworks/models/minimax-m2p5",
  "gemini/gemini-3-flash-preview",
] as const;

/**
 * No usable deck produced. Root cause is usually on the portal/upstream side
 * (Bifrost→provider timeouts, in-stream timeout events) — see
 * https://github.com/zeta-chain/ai-portal/issues/907 for the known Gemini
 * and MiniMax upstream-timeout bucket.
 */
export const FAILING_MODELS = [
  "gemini/gemini-3.1-pro-preview",
  "minimax/MiniMax-M2.7",
  "fireworks/accounts/fireworks/models/minimax-m2p1",
  "gemini/gemma-4-31b-it",
  "openrouter/qwen/qwen3.6-plus",
] as const;

/** Every active curated model, irrespective of last observed status. */
export const ALL_MODELS = [...PASSING_MODELS, ...PARTIAL_MODELS, ...FAILING_MODELS] as const;
