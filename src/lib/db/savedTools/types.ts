/**
 * Types for the saved tools storage module.
 *
 * Saved tools are user-created HTML apps that are persisted and exposed
 * to the LLM as callable tools in future conversations.
 */

/** A single parameter definition within a saved tool. */
export interface SavedToolParameter {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
  /** The default value currently in the HTML — replaced with the LLM-provided value at invocation. */
  defaultValue?: string;
}

/** Plain object representation of a saved tool record. */
export interface StoredSavedTool {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Internal name used in the tool function name (e.g. "stocks_tracker") */
  name: string;
  /** Human-readable display name (e.g. "Stock Price Tracker") */
  displayName: string;
  /** LLM-facing description — determines when the model invokes this tool */
  description: string;
  /** Parameters the LLM can pass when calling this tool */
  parameters: Record<string, SavedToolParameter>;
  /** The saved HTML template */
  html: string;
  /** ID of the conversation where this app was originally created */
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

/** Options for creating a new saved tool. */
export interface CreateSavedToolOptions {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, SavedToolParameter>;
  html: string;
  conversationId?: string;
}

/** Options for updating an existing saved tool (all fields optional). */
export interface UpdateSavedToolOptions {
  name?: string;
  displayName?: string;
  description?: string;
  parameters?: Record<string, SavedToolParameter>;
  html?: string;
}
