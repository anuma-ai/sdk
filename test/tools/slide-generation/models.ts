export const PASSING_MODELS = [
  "fireworks/accounts/fireworks/models/kimi-k2p5",
  "cerebras/qwen-3-235b-a22b-instruct-2507",
  "fireworks/accounts/fireworks/models/deepseek-v3p2",
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

export const SCHEMA_NONCOMPLIANT = ["gemini/gemini-3-flash-preview"] as const;

export const FAILING = ["gemini/gemma-4-31b-it"] as const;

export const MODELS = [...PASSING_MODELS, ...SCHEMA_NONCOMPLIANT, ...FAILING] as const;
