import { v7 as uuidv7 } from "uuid";
import type { Database } from "@nozbe/watermelondb";

/**
 * A stored display interaction record.
 */
export interface StoredDisplayInteraction {
  /** WatermelonDB record ID */
  id: string;
  /** Stable interaction ID (e.g. "chart_1234567890_abc") */
  interactionId: string;
  /** Conversation this interaction belongs to */
  conversationId: string;
  /** ID of the message this interaction is anchored after (undefined = unanchored) */
  messageId?: string;
  /** Display type identifier (e.g. "chart") */
  displayType: string;
  /** Schema version of the tool that produced this result */
  toolVersion: number;
  /** The resolved result data (typed as any; JSON-serialised in the DB) */
  result: any;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Options for creating a new display interaction record.
 */
export interface CreateDisplayInteractionOptions {
  /** Pre-generated interaction ID. If omitted, one will be generated. */
  interactionId?: string;
  /** Conversation this interaction belongs to */
  conversationId: string;
  /** ID of the message this interaction is anchored after */
  messageId?: string;
  /** Display type identifier (e.g. "chart") */
  displayType: string;
  /** Schema version of the tool result */
  toolVersion: number;
  /** The resolved result data */
  result: any;
}

/**
 * Context required for display interaction database operations.
 */
export interface DisplayInteractionOperationsContext {
  database: Database;
}

/**
 * Generate a unique interaction ID.
 */
export function generateDisplayInteractionId(): string {
  return `disp_${uuidv7()}`;
}
