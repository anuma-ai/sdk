import type { AgentConfig } from "@anuma/sdk";

import { SENTINEL_PROMPT } from "./prompt";
import { SENTINEL_SKILL_JOURNEYS } from "./journeys";
import { SENTINEL_SKILLS } from "./skills";

export { SENTINEL_PROMPT } from "./prompt";
export { SENTINEL_SKILL_JOURNEYS } from "./journeys";
export {
  chargebackAssistant,
  collectionResponse,
  SENTINEL_SKILLS,
  subscriptionChecker,
} from "./skills";

/** Sentinel finance agent configuration. */
export const sentinelAgent: AgentConfig = {
  id: "sentinel",
  runtimes: ["server"],
  prompt: SENTINEL_PROMPT,
  skills: SENTINEL_SKILLS,
  tools: [],
  model: {
    default: "anthropic/claude-sonnet-4-6",
    allowed: ["anthropic/claude-sonnet-4-6"],
  },
  skillJourneys: SENTINEL_SKILL_JOURNEYS,
  manifest: {
    id: "sentinel",
    name: "Sentinel",
    description: "AI-powered billing analyst and money recovery advisor",
    runtimes: ["server"],
    skills: SENTINEL_SKILLS.map(({ id, name, requiredVariables, smsPrompts }) => ({
      id,
      name,
      requiredVariables,
      smsPrompts,
    })),
  },
};
