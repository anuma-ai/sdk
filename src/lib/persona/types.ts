// ── Prompt Builder Types ──

/** A single section in the system prompt. */
export interface PromptSection {
  /** Unique identifier (used for disabling/overriding). */
  key: string;
  /** Lower priority = earlier in the prompt. Sections sort ascending. */
  priority: number;
  /** Return text to append, or null to skip this section. */
  render: (ctx: PromptContext) => string | null;
}

/** Context passed to every section renderer. */
export interface PromptContext {
  /** Base personality prompt (from PersonaConfig.prompt). */
  basePrompt: string;
  /** User-set "act as X" communication preference. */
  persona?: string | null;
  /** Analyzed user communication style profile. */
  styleProfile?: string | null;
  /** Detected user sentiment. */
  sentiment?: "frustrated" | "positive" | "neutral" | null;
  /** ISO 639-1 language code, 'other', or null for English/undetected. */
  preferredLanguage?: string | null;
  /** Platform-specific formatting instructions from PersonaConfig. */
  platformFormatting?: string | null;
  /** Available tools. */
  toolSummaries?: Array<{ name: string; description: string }>;
  /** Consumer-specific data for custom sections. */
  extra?: Record<string, unknown>;
}

/** Configurable template strings for built-in section renderers. */
export interface PromptTemplates {
  tools: string;
  persona: string;
  style: string;
  sentiment: { frustrated: string; positive: string };
  language: string;
  languageGeneric: string;
  platformFormatting: string;
}

/** Options for buildSystemPrompt(). */
export interface BuildPromptOptions {
  /** Additional sections appended to defaults. */
  extraSections?: PromptSection[];
  /** Section keys to skip. */
  disabled?: string[];
  /** Max total prompt length in characters. 0 = unlimited. */
  maxLength?: number;
  /** Override default template strings. */
  templates?: Partial<PromptTemplates>;
}

/** Result of buildSystemPrompt(). */
export interface BuildPromptResult {
  /** The assembled prompt string. */
  prompt: string;
  /** Keys of sections that rendered (in order). */
  activeSections: string[];
}

// ── Style Analysis Types ──

/** Options for analyzeStyle(). */
export interface AnalyzeStyleOptions {
  /** Recent conversation messages. */
  messages: Array<{ role: string; content: string }>;
  /** Callback to send messages to an LLM and get a text response. */
  callLlm: (messages: Array<{ role: string; content: string }>) => Promise<string | null>;
  /** Max user messages to consider (default: 10). */
  maxInputMessages?: number;
  /** Minimum user messages required (default: 3). */
  minMessages?: number;
  /** Max profile length in characters (default: 200). */
  maxProfileLength?: number;
  /** Custom system prompt for the analysis model. */
  analysisPrompt?: string;
  /** Regex to filter out document-embedded messages. */
  documentPattern?: RegExp;
}

/** Result of analyzeStyle(). */
export interface AnalyzeStyleResult {
  /** The style profile string, or null if skipped/failed. */
  profile: string | null;
}

/** Input for shouldAnalyzeStyle(). */
export interface StyleAnalysisSchedule {
  /** Current message count for the user. */
  messageCount: number;
  /** Whether the user already has a style profile. */
  hasProfile: boolean;
  /** Whether analysis has ever run (updatedAt timestamp is set). */
  hasBeenAnalyzed: boolean;
  /** Whether the user opted out (updatedAt set but profile is null). */
  optedOut: boolean;
  /** Trigger analysis after this many messages (default: 5). */
  analyzeAfterMessages?: number;
  /** Re-analyze every N messages (default: 20). */
  refreshEveryMessages?: number;
}
