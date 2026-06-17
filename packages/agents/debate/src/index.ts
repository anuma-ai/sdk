export { DRAFT_PROMPT, CRITIQUE_PROMPT, REVISE_PROMPT, SYNTHESIZE_PROMPT } from "./prompts";
export {
  submitDraftSchema,
  submitCritiqueSchema,
  submitRevisionSchema,
  submitFinalSchema,
  DEBATE_SCHEMAS,
} from "./schemas";
export type { DebateToolSchema } from "./schemas";
export { debateRun } from "./skill";
