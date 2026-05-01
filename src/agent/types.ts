/** Runtime environment where the agent can execute. */
export type AgentRuntime = "client" | "server";

/** Configuration for a single agent skill (task template). */
export interface SkillConfig {
  /** Unique identifier. Convention: "domain.action" e.g. "housing.lease-review" */
  id: string;
  /** Human-readable name. */
  name: string;
  /** System prompt template with {{variable}} placeholders. */
  promptTemplate: string;
  /** MCP tool names this skill requires. */
  requiredTools?: string[];
  /** Preferred model when the caller doesn't specify one. */
  preferredModel?: string;
  /** Max agentic loop steps for this skill. */
  maxSteps?: number;
  /** Variables the promptTemplate expects at runtime. */
  requiredVariables?: string[];
  /** Additional context appended after the prompt template. */
  contextSuffix?: string;
}

/** Public-safe manifest describing an agent (no prompt or tool details). */
export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  runtimes: AgentRuntime[];
  skills: Array<{ id: string; name: string; requiredVariables?: string[] }>;
}

/** Allowed input types for skill journey form fields. */
export type SkillJourneyFieldType = "text" | "textarea" | "select";

/** Properties shared by every skill journey field, regardless of input type. */
interface SkillJourneyFieldBase {
  key: string;
  label: string;
  placeholder: string;
  helper?: string;
  required?: boolean;
}

/**
 * A single field in a skill journey intake form. Discriminated on `type`:
 * `select` requires `options`; `text` / `textarea` cannot carry options.
 */
export type SkillJourneyField =
  | (SkillJourneyFieldBase & { type: "text" | "textarea" })
  | (SkillJourneyFieldBase & { type: "select"; options: string[] });

/** Full definition for rendering a skill intake form and building the prompt. */
export interface SkillJourneyDefinition {
  title: string;
  description: string;
  steps: string[];
  /** When true, the journey renders a file upload step before the fields. */
  acceptsFiles: boolean;
  /** Label for the file upload step. Only meaningful when `acceptsFiles` is true. */
  fileLabel?: string;
  /** Helper text for the file upload step. Only meaningful when `acceptsFiles` is true. */
  fileHint?: string;
  /** Per-skill copy for the file upload step prompt. Only meaningful when `acceptsFiles` is true. */
  filePrompt?: string;
  fields: SkillJourneyField[];
  /**
   * When true, the journey expects substantive input — at least one of an
   * `acceptsFiles` upload or a text/textarea field — for the agent to act on.
   * Consumers (form renderers and direct API callers alike) should enforce
   * "file or text provided" before invoking the skill.
   */
  requiresContext: boolean;
  submitLabel: string;
  promptTitle: string;
  /** Extra system prompt context injected per-skill for structured output guidance. */
  systemContext?: string;
}

/** Full agent configuration including prompt, skills, tools, and model settings. */
export interface AgentConfig {
  id: string;
  runtimes: AgentRuntime[];
  prompt: string;
  skills: SkillConfig[];
  /** Tool configs are agent-specific, so we keep this generic. */
  tools: unknown[];
  model: { default: string; allowed?: string[] };
  manifest: AgentManifest;
  /** Form schemas for rendering skill intake forms on the client. */
  skillJourneys?: Record<string, SkillJourneyDefinition>;
}
