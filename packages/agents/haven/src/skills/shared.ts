import type { SkillConfig } from "@anuma/sdk";

export const HOUSING_REQUIRED_TOOLS: SkillConfig["requiredTools"] = [
  "JinaMCP-search_web",
  "JinaMCP-parallel_search_web",
  "AnumaSearchMCP-anuma_text_search",
];

export const HOUSING_PREFERRED_MODEL = "anthropic/claude-sonnet-4-6";

export const HOUSING_MEMORY_SUFFIX = `## Memory & Context
If prior housing context is provided below (e.g., prior lease issues, rent increases, landlord disputes, HOA actions, property details), reference it to make the analysis more personalized and avoid asking for details the user already shared. Call out meaningful changes from prior housing records.

At the end of your response, include a "Key Facts to Remember" section listing 2-5 short facts worth tracking for this user (e.g., "Lives at 123 Main St in Austin under a month-to-month lease" or "HOA dispute with Willow Creek HOA about a fence violation notice"). These will be saved to the user's private memory vault for future sessions.

{{memory_context}}`;
