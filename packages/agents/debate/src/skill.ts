import type { SkillConfig } from "@anuma/sdk";

/**
 * The single debate skill. Unlike Haven/Sentinel persona skills, the debate
 * orchestration lives in the agent server (cf-tasks): this skill just carries
 * the job config. The per-stage prompts come from ./prompts and the per-stage
 * structure from ./schemas; this template is the orchestration entry point.
 *
 * `models` is a comma-joined model-id string resolved client-side from a panel
 * (DESIGN §0.6) — the wire type stays `Record<string, string>`, so the list
 * crosses as a delimited string the server splits, not a `string[]`.
 */
export const debateRun: SkillConfig = {
  id: "debate.run",
  name: "Council Debate",
  promptTemplate: `Run a multi-model debate to answer the user's question.

The participants ({{models}}) each draft an answer, challenge each other's drafts, revise over {{rounds}} round(s), and a final synthesis folds their positions into one calibrated answer.

## Question
{{prompt}}`,
  requiredVariables: ["prompt", "models", "rounds"],
};
