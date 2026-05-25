import type { AgentConfig } from "@anuma/sdk";
import { APP_BUILDER_PROMPT } from "@anuma/sdk/tools";

// Re-export so consumers can pull the prompt from this package without
// also depending on `@anuma/sdk/tools` directly. Mirrors the pattern in
// `@anuma/agent-sentinel` and `@anuma/agent-haven`, where the prompt
// constant is the package's public surface alongside the agent config.
export { APP_BUILDER_PROMPT } from "@anuma/sdk/tools";

/** App Builder agent configuration.
 *
 *  Generates polished React apps from natural-language requests. Tools
 *  (create_file, patch_file, read_file, delete_file, list_files,
 *  audit_design, critique_design) are constructed at runtime by
 *  `createAppGenerationTools` in the SDK — see `@anuma/sdk/tools`. The
 *  agent's `tools` field is intentionally empty: app-gen tools need a
 *  per-host storage adapter and can't be statically registered.
 *
 *  Skills are empty for now — app-builder is a single conversational
 *  workflow rather than a set of discrete intake forms like Sentinel's
 *  `chargebackAssistant` / `collectionResponse`. */
export const appBuilderAgent: AgentConfig = {
  id: "app-builder",
  runtimes: ["server"],
  prompt: APP_BUILDER_PROMPT,
  skills: [],
  tools: [],
  model: {
    default: "anthropic/claude-opus-4-7",
    allowed: ["anthropic/claude-opus-4-7", "anthropic/claude-sonnet-4-6"],
  },
  manifest: {
    id: "app-builder",
    name: "App Builder",
    description:
      "Generates polished, designed React apps from natural-language requests, with read-before-patch tooling and built-in design audit and critique loops.",
    runtimes: ["server"],
    skills: [],
  },
};
