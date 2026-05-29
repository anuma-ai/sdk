/** Runtime environment where the agent can execute. */
export type AgentRuntime = "client" | "server";

/** Strategy a consumer should use to extract text from an uploaded file before
 *  feeding it into a skill journey field. The SDK only labels the strategy —
 *  the actual extraction (pdf.js, OCR, etc.) is the consumer's responsibility. */
export type FileExtractionStrategy = "pdf-text" | "csv-text" | "image-ocr";

/** Character cap for multiline / textarea fields. Agent gateways (e.g. cf-tasks)
 *  truncate values to this length before interpolating them into prompt templates.
 *  Shared across all agent packages so a single change updates every journey
 *  declaration simultaneously. */
export const MULTILINE_FIELD_MAX = 50_000;

/** Configuration for a single agent skill (task template). */
export interface SkillConfig {
  /** Unique identifier. Convention: "domain.action" e.g. "housing.lease-review" */
  id: string;
  /** Human-readable name. */
  name: string;
  /** System prompt template with {{variable}} placeholders. */
  promptTemplate: string;
  /**
   * User-turn template, interpolated with the same {{variable}} placeholders
   * as `promptTemplate`. Optional, but strongly recommended for skill-driven
   * (non-freeform) flows so the model receives a proper user turn — most
   * Anthropic models reject requests that contain only a system message.
   */
  userTemplate?: string;
  /** MCP tool names this skill requires. */
  requiredTools?: string[];
  /** Preferred model when the caller doesn't specify one. */
  preferredModel?: string;
  /** Max agentic loop steps for this skill. */
  maxSteps?: number;
  /** Variables the promptTemplate expects at runtime. */
  requiredVariables?: string[];
  /**
   * SMS-friendly question prompts keyed by variable name. The Anuma text
   * gateway sends each prompt to the user one at a time and treats the
   * user's reply as the slot value. Missing entries fall back to a
   * generic "Please provide {name}." question in the gateway.
   *
   * Order of questions follows requiredVariables[] order.
   */
  smsPrompts?: Record<string, string>;
  /** Additional context appended after the prompt template. */
  contextSuffix?: string;
  /** Lucide icon identifier (e.g. "FileSearch") for renderers that draw a skill icon. */
  iconName?: string;
  /** One-line announcement string shown when the skill is launched (channel-neutral). */
  launchMessage?: string;
  /** Conversational preamble shown after the user picks this skill, before the field
   *  questions begin. Used by chat-native guided flows (web, mobile, SMS, voice). */
  preamble?: string;
  /** Closing line shown after the user finishes the last field and before the agent
   *  starts the tool loop. Used by chat-native guided flows. */
  closing?: string;
  /** Fallback nudge for any required field on this skill that doesn't define its own
   *  `requiredNudge` string. */
  requiredNudgeDefault?: string;
}

/** Public-safe manifest describing an agent (no prompt or tool details). */
export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  runtimes: AgentRuntime[];
  skills: Array<{
    id: string;
    name: string;
    requiredVariables?: string[];
    smsPrompts?: Record<string, string>;
  }>;
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
  /** Conversational ask used by chat-native guided flows (web, mobile, SMS, voice).
   *  Falls through to `label` when not set. */
  chatPrompt?: string;
  /** Skill-specific nudge shown when the user skips a required field. Falls through
   *  to `SkillConfig.requiredNudgeDefault` when not set. */
  requiredNudge?: string;
  /** Server-side sanitiser cap on the value's character length. Today's gateways
   *  truncate textarea fields at `MULTILINE_FIELD_MAX` characters. */
  maxLength?: number;
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
  /** How consumers should derive text from an attached file. Describes extraction
   *  only — it is **not** a file-type filter. Files outside the strategy's expected
   *  MIME type (e.g. photos when the strategy is `pdf-text`) are still uploaded and
   *  forwarded to the agent as attachments; they are simply not text-extracted.
   *  The extracted text is written to the variable named by `extractedTextTarget`.
   *  Only meaningful when `acceptsFiles` is true. */
  fileExtractionStrategy?: FileExtractionStrategy;
  /** Variable name to write extracted text into. May coincide with a field's `key`
   *  (the upload replaces typed input for that field, e.g. `lease_text`) or name a
   *  separate template variable not tied to any field (e.g. `rent_notice_text`,
   *  `supporting_document_text`). Only meaningful when `acceptsFiles` is true and
   *  `fileExtractionStrategy` is set. */
  extractedTextTarget?: string;
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

// ---------------------------------------------------------------------------
// Marketplace content (per-agent preview cards rendered in the agent picker)
// ---------------------------------------------------------------------------

/** Marketplace filter the agent should appear under in the picker UI. */
export type AgentMarketplaceFamily = "text" | "lifestyle";

/** What kind of action the marketplace card's primary CTA performs. */
export type AgentPrimaryActionKind = "text" | "group" | "guided";

/** Visual tone for a transcript section heading. */
export type AgentTranscriptTone = "danger" | "warning" | "success";

/** A single bullet inside a marketplace analysis transcript section. */
export interface AgentTranscriptItem {
  title: string;
  detail: string;
}

/** A grouped block of bullets in a marketplace analysis transcript. */
export interface AgentAnalysisSection {
  title: string;
  tone: AgentTranscriptTone;
  items: AgentTranscriptItem[];
}

/** A todo entry inside a marketplace agenda transcript. */
export interface AgentAgendaItem {
  title: string;
  badge?: string;
  badgeTone?: "warning" | "danger";
}

/** A schedule entry inside a marketplace agenda transcript. */
export interface AgentScheduleItem {
  title: string;
  time: string;
}

/** Marketplace transcript shape for productivity / agenda style agents. */
export interface AgentAgendaTranscript {
  kind: "agenda";
  userMessage: string;
  intro: string;
  todos: AgentAgendaItem[];
  schedule: AgentScheduleItem[];
  followUp: string;
  actions: string[];
}

/** Marketplace transcript shape for analysis / dispute style agents. */
export interface AgentAnalysisTranscript {
  kind: "analysis";
  userMessage: string;
  intro: string;
  sections: AgentAnalysisSection[];
  followUp: string;
  actions: string[];
}

/** A scripted marketplace conversation preview, discriminated on `kind`. */
export type AgentMarketplaceTranscript = AgentAgendaTranscript | AgentAnalysisTranscript;

/** Marketplace card content for an agent — the data the picker UI renders. */
export interface AgentMarketplaceContent {
  family: AgentMarketplaceFamily;
  roleLabel: string;
  primaryActionLabel: string;
  primaryActionKind: AgentPrimaryActionKind;
  cardUseCases: string[];
  cardKnowledge: string[];
  quickPrompts: string[];
  emptyStateDescription: string;
  transcript: AgentMarketplaceTranscript;
}

// ---------------------------------------------------------------------------
// UI metadata (color, icon, example conversations) for renderer fallbacks
// ---------------------------------------------------------------------------

/** A single (user, agent) example conversation entry, keyed by i18n string ids. */
export interface AgentExampleConversation {
  userKey: string;
  agentKey: string;
}

/** UI metadata used by clients when the portal doesn't supply richer data. */
export interface AgentUiMetadata {
  /** Hex color used by the agent card and accents. */
  color: string;
  /** Lucide icon identifier (e.g. "users"). */
  icon: string;
  /** i18n keys for the per-agent feature bullets. */
  features: string[];
  /** i18n keys for the example conversation strings. */
  exampleConversations: AgentExampleConversation[];
  /** Memory folder names this agent typically uses. */
  suggestedMemoryFolders?: string[];
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
  /** First assistant message shown when the agent is opened. Supports the
   *  `{{agent_name}}` placeholder so consumers can substitute the portal-display
   *  name without changing this string. */
  greeting?: string;
  /** Sub-copy shown under the agent picker / guided-flow header. Supports the
   *  `{{agent_name}}` placeholder, same as `greeting`. */
  guidedFlowSubcopy?: string;
  /** Marketplace card content rendered in the agent picker. */
  marketplace?: AgentMarketplaceContent;
  /** UI metadata (color, icon, example conversations) for renderer fallbacks. */
  uiMetadata?: AgentUiMetadata;
  /** One-time disclaimer shown in a popup the first time a user opens
   *  a chat with this agent. Plain text; consumers split on `\n` for paragraphs.
   *  May include `{{agent_name}}` placeholder. */
  firstTimeDisclaimer?: string;

  /** Persistent one-line disclaimer rendered under the chat input
   *  whenever this agent's chat is open. May include `{{agent_name}}`
   *  placeholder. */
  persistentFooter?: string;
}
