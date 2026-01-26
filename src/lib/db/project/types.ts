/**
 * Project types for grouping conversations.
 *
 * A project groups multiple conversations together, allowing users
 * to organize their conversations by topic, purpose, or any other criteria.
 */

/**
 * Stored representation of a project in the database.
 */
export interface StoredProject {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** User-facing project ID (indexed for queries) */
  projectId: string;
  /** Display name of the project (editable) */
  name: string;
  /** When the project was created */
  createdAt: Date;
  /** When the project was last updated */
  updatedAt: Date;
  /** Soft delete flag */
  isDeleted: boolean;
}

/**
 * Options for creating a new project.
 */
export interface CreateProjectOptions {
  /** Optional custom project ID (auto-generated if not provided) */
  projectId?: string;
  /** Name of the project (default: "New Project") */
  name?: string;
}

/**
 * Options for updating a project.
 */
export interface UpdateProjectOptions {
  /** New name for the project */
  name?: string;
}

/**
 * Generates a unique project ID with timestamp and random suffix.
 * Format: proj_<timestamp>_<random>
 */
export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
