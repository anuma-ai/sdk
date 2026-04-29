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

/** A single field in a skill journey intake form. */
export interface SkillJourneyField {
  key: string;
  label: string;
  placeholder: string;
  helper?: string;
  type: SkillJourneyFieldType;
  required?: boolean;
  options?: string[];
}

/** Full definition for rendering a skill intake form and building the prompt. */
export interface SkillJourneyDefinition {
  title: string;
  description: string;
  steps: string[];
  acceptsFiles: boolean;
  fileLabel: string;
  fileHint: string;
  fields: SkillJourneyField[];
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
