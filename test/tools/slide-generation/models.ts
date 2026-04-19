/**
 * Active Anuma models to exercise slide-generation tests against. Mirrors the
 * `active: true` entries in Anuma's `VISION_MODELS` config.
 *
 * Run all of them at once:
 *
 *   E2E_MODELS="$(node -e 'console.log(require(\"./test/tools/slide-generation/models.ts\").MODELS.join(\",\"))')" \
 *     pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 */
export const MODELS = [
  "fireworks/accounts/fireworks/models/kimi-k2p5",
  "openai/gpt-5.4",
  "openai/gpt-5.2",
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "grok/grok-4-1-fast-reasoning",
  "grok/grok-4-1-fast-non-reasoning",
  "cerebras/qwen-3-235b-a22b-instruct-2507",
  "openrouter/qwen/qwen3.6-plus",
  "fireworks/accounts/fireworks/models/glm-5",
  "cerebras/zai-glm-4.7",
  "fireworks/accounts/fireworks/models/deepseek-v3p2",
  "fireworks/accounts/fireworks/models/minimax-m2p5",
  "fireworks/accounts/fireworks/models/minimax-m2p1",
  "minimax/MiniMax-M2.7",
  "gemini/gemini-3.1-pro-preview",
  "gemini/gemini-3-flash-preview",
  "gemini/gemma-4-31b-it",
] as const;
