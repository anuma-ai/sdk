/**
 * @anuma/sdk/agents/promptseal — hiring agent definition.
 *
 * Five fake resumes, three tools (resume_parse → score_candidate → decide),
 * and a `useHiringDemo` hook that wires the agent into `runToolLoop` with
 * receipt-shaped hooks. Mirrors the Python reference at
 * `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/agent/`.
 *
 * `score_candidate` is **synthetic** here (no inner LLM call) — the Python
 * demo's nested-call shape is preserved by re-running Python separately.
 * See ARCHITECTURE.md §10a for the demo-narrative split.
 */
export { buildHiringSystemPrompt } from "./prompt";
export { createHiringTools, decideRule } from "./tools";
export { findResume, type Resume, RESUMES } from "./resumes";
export {
  type AnchorTxInfo,
  DEFAULT_AGENT_ID,
  DEFAULT_CHAIN_ID,
  DEFAULT_DB_NAME,
  DEFAULT_REGISTRY,
  DEFAULT_RPC,
  DEFAULT_TOKEN_ID,
  type FinalDecision,
  type HiringDemoState,
  useHiringDemo,
  type UseHiringDemoOptions,
  type UseHiringDemoReturn,
} from "./useHiringDemo";
