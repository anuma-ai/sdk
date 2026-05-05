import type { WriterContext } from "../../truthLayer/types";

export interface StoredVaultMemory {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Plain text memory content */
  content: string;
  /** Scope for partitioning memories (e.g., "private", "shared") */
  scope: string;
  /** Folder ID for organization, null if unfiled */
  folderId: string | null;
  /** User ID for multi-user server-side scoping, null on client */
  userId: string | null;
  /** JSON-stringified embedding vector, null if not yet computed */
  embedding: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;

  // ── Truth Layer (v28) — cryptographic provenance + append-only history ──

  /** Hex-encoded signature over (content_hash + grant_id + parent + timestamp). Null = legacy unsigned. */
  signature: string | null;
  /** Grant that authorized this write. Null = legacy. */
  grantId: string | null;
  /** JSON of SourceMetadata: { origin, sessionId, messageId, model, reviewed, ... } */
  sourceMetadata: string | null;
  /** Hash of the parent memory this one supersedes (append-only history). */
  parentStateHash: string | null;
  /** Tombstone timestamp (unix ms); null = active, non-null = retired. */
  retiredAt: number | null;
}

export interface CreateVaultMemoryOptions {
  content: string;
  /** Scope for the memory. Defaults to "private" if omitted. */
  scope?: string;
  /** Folder ID for organization, null or omitted if unfiled */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist */
  embedding?: string;
  /**
   * Truth Layer writer context. When provided, the memory is signed against
   * this grant and source metadata is recorded. Omit for legacy unsigned writes.
   */
  writerContext?: WriterContext;
  /**
   * Hash of the parent memory this one supersedes (append-only update flow).
   * Set automatically by retireAndCreate; consumers normally don't pass this.
   */
  parentStateHash?: string;
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
  /** If provided, moves the memory to this folder. */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist, or null to clear stale embedding */
  embedding?: string | null;
  /**
   * Truth Layer writer context. When provided, the update is converted to
   * append-new + retire-old (no in-place mutation). Omit for legacy
   * in-place mutation behavior (preserves existing callers).
   */
  writerContext?: WriterContext;
}

export interface RetireVaultMemoryOptions {
  /** Truth Layer writer context authorizing the retirement. */
  writerContext: WriterContext;
  /** Optional reason string captured in metadata for audit. */
  reason?: string;
}

export interface VaultRootResult {
  /** Merkle root over the active (non-retired) memory set. */
  root: string;
  /** Number of memories included in the root. */
  memoryCount: number;
  /** Hashes of all leaves used to compute the root, in order. */
  leafHashes: string[];
}

export interface MemoryHistoryEntry {
  memory: StoredVaultMemory;
  /** Whether this version is currently active (vs. retired/superseded). */
  isActive: boolean;
}
