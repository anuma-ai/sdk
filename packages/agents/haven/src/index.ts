import type { AgentConfig } from "@anuma/sdk";

import { HAVEN_PROMPT } from "./prompt";
import { HAVEN_SKILLS } from "./skills";

export { HAVEN_PROMPT } from "./prompt";
export { demandLetter, HAVEN_SKILLS, hoaDispute, leaseReview, rentIncreaseChecker } from "./skills";

/** Haven housing agent configuration. */
export const havenAgent: AgentConfig = {
  id: "haven",
  runtimes: ["server"],
  prompt: HAVEN_PROMPT,
  skills: HAVEN_SKILLS,
  tools: [],
  model: {
    default: "anthropic/claude-sonnet-4-6",
    allowed: ["anthropic/claude-sonnet-4-6"],
  },
  manifest: {
    id: "haven",
    name: "Haven",
    description: "AI-powered housing and tenant rights advisor",
    runtimes: ["server"],
    skills: HAVEN_SKILLS.map(({ id, name, requiredVariables }) => ({
      id,
      name,
      requiredVariables,
    })),
  },
};
