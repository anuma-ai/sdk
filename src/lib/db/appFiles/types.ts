/**
 * Types for the app files storage module.
 *
 * App files are the HTML/CSS/JS source files for LLM-generated apps,
 * stored per conversation. Each file is identified by a conversationId + path pair.
 */

/** Plain object representation of an app file record. */
export interface StoredAppFile {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** The conversation this file belongs to */
  conversationId: string;
  /** Normalized file path, no leading slash (e.g. "index.html", "src/App.tsx") */
  path: string;
  /** File content (UTF-8 text) */
  content: string;
  updatedAt: Date;
}
