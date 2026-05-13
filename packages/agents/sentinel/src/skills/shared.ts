import type { SkillConfig } from "@anuma/sdk";

export const FINANCE_REQUIRED_TOOLS: SkillConfig["requiredTools"] = [
  "JinaMCP-search_web",
  "JinaMCP-parallel_search_web",
  "AnumaSearchMCP-anuma_text_search",
];

export const FINANCE_PREFERRED_MODEL = "anthropic/claude-sonnet-4-6";

export const FINANCE_MEMORY_SUFFIX = `## Memory & Context
If prior finance context is provided below (e.g., recurring subscriptions, past disputes, collection notices, statement patterns), reference it to make the analysis more personalized and avoid asking for details the user already shared. Call out meaningful changes from prior financial records.

At the end of your response, include a "Key Facts to Remember" section listing 2-5 short facts worth tracking for this user (e.g., "Disputed a $124 unauthorized charge from XYZ in March 2026" or "Subscribes to Netflix Premium ($24.99) and Apple One Family ($25.95)"). These will be saved to the user's private memory vault for future sessions.

{{memory_context}}`;
