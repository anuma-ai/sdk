/**
 * Anuma model fleet for slide-generation tests, grouped by observed behavior
 * on the per-slide deck architecture (plan_deck + add_slide per slide).
 *
 *   - PASSING_MODELS     — produce a structurally valid deck (≥7 slides, no
 *                          malformed elements). Most land at 7–9 slides on
 *                          the "at least 10" gardening prompt; only kimi
 *                          reliably clears 10. Coming up short is a prompt-
 *                          following miss, not a structural failure.
 *   - SCHEMA_NONCOMPLIANT — complete generation but emit malformed element
 *                          fields (e.g. omit `w`). Needs alias/shape
 *                          normalization in the executor before clean output.
 *   - FAILING            — produce no slides at all (tool calls fail or the
 *                          store ends up empty).
 *
 * Run the full fleet:
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 *
 * Run only the passing tier:
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").PASSING_MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 */

/** Models that produce a clean, structurally valid deck on the per-slide flow. */
export const PASSING_MODELS = [
  "fireworks/accounts/fireworks/models/kimi-k2p5",
  "cerebras/qwen-3-235b-a22b-instruct-2507",
  "cerebras/zai-glm-4.7",
  "fireworks/accounts/fireworks/models/glm-5",
  "fireworks/accounts/fireworks/models/deepseek-v3p2",
  "grok/grok-4-1-fast-non-reasoning",
  "grok/grok-4-1-fast-reasoning",
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-5.2",
  "openai/gpt-5.4",
  "gemini/gemini-3.1-pro-preview",
  "minimax/MiniMax-M2.7",
  "fireworks/accounts/fireworks/models/minimax-m2p5",
  "fireworks/accounts/fireworks/models/minimax-m2p7",
  "openrouter/qwen/qwen3.6-plus",
] as const;

/**
 * Models that complete generation but emit elements with missing or wrong
 * fields (e.g. omit required geometry). Fix path: alias/shape normalization
 * in the add_slide executor.
 */
export const SCHEMA_NONCOMPLIANT = [
  // Systematically omits `w` on many text elements (41 of them on a 9-slide run).
  "gemini/gemini-3-flash-preview",
] as const;

/** Models that produce no deck at all (empty slides.json or tool-call errors). */
export const FAILING = [
  "gemini/gemma-4-31b-it",
] as const;

/** Full fleet. */
export const MODELS = [...PASSING_MODELS, ...SCHEMA_NONCOMPLIANT, ...FAILING] as const;
