/**
 * Anuma model fleet for slide-generation tests, grouped by reliability.
 *
 * Tiers based on observed behavior running the gardening deck e2e test:
 *   - DEFAULT_MODELS  — non-reasoning models that pass 10-slide runs reliably.
 *                       Use these as the default matrix for CI / day-to-day testing.
 *   - PORTAL_BOUND    — fail today due to portal/upstream timeout ceilings
 *                       (zeta-chain/ai-portal#912). Will unblock when the
 *                       portal raises per-provider stream timeouts.
 *   - SCHEMA_NONCOMPLIANT — models that ignore our element schema (emit
 *                       `type`/`content`/pixel-coords instead of
 *                       `kind`/`text`/percentages). Separate fix: add
 *                       alias normalization in the create_slides executor.
 *
 * Run the full fleet:
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 *
 * Run the reliable subset:
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").DEFAULT_MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 */

/** Non-reasoning models that reliably pass 10-slide generation today. */
export const DEFAULT_MODELS = [
  "fireworks/accounts/fireworks/models/kimi-k2p5",
  "cerebras/qwen-3-235b-a22b-instruct-2507",
  "cerebras/zai-glm-4.7",
  "fireworks/accounts/fireworks/models/glm-5",
  "fireworks/accounts/fireworks/models/deepseek-v3p2",
  "grok/grok-4-1-fast-non-reasoning",
] as const;

/**
 * Models bound by portal / upstream per-provider stream timeouts. Tracking at
 * zeta-chain/ai-portal#912. Most are reasoning models that burn the stream
 * budget on internal chain-of-thought before emitting tool calls.
 */
export const PORTAL_BOUND = [
  "openai/gpt-5.4",
  "openai/gpt-5.2",
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "grok/grok-4-1-fast-reasoning",
  "minimax/MiniMax-M2.7",
  "gemini/gemini-3.1-pro-preview",
  "gemini/gemma-4-31b-it",
] as const;

/**
 * Models that complete generation but emit elements with wrong field names
 * (`type`/`content`/pixel coords) instead of our schema (`kind`/`text`/
 * percentages). Would benefit from alias normalization in the executor.
 */
export const SCHEMA_NONCOMPLIANT = [
  "openrouter/qwen/qwen3.6-plus",
  "fireworks/accounts/fireworks/models/minimax-m2p5",
  "fireworks/accounts/fireworks/models/minimax-m2p7",
  "gemini/gemini-3-flash-preview",
] as const;

/** Full fleet (default + portal-bound + schema-noncompliant). */
export const MODELS = [...DEFAULT_MODELS, ...PORTAL_BOUND, ...SCHEMA_NONCOMPLIANT] as const;
