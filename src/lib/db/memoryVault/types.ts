import type { FactType } from "../../memory/autoExtract.js";
import type { StoredTopic } from "../entities/types.js";

/**
 * People Nearby cross-user visibility. ORTHOGONAL to `scope` (model access):
 * - `private`: local-only (default; null column grandfathered as private)
 * - `public`: embedding + plaintext may be published (compatibility matching,
 *   profile display, discovery answers, digital-twin prompts)
 *
 * TWO TIERS ONLY (decided 2026-07-27). An earlier design had a middle
 * `matchable` tier that published a memory's embedding while keeping its text
 * on-device; it was dropped, so a memory either never leaves the device or is
 * published with its content. Any unrecognised stored value — including a
 * `matchable` row written by a pre-release build — reads as `private`, which is
 * the fail-safe direction: it un-publishes rather than exposes.
 */
export type VaultMemoryVisibility = "private" | "public";

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
  /** Model that produced `embedding`. Null on legacy rows (grandfathered as
   * compatible with the current model). */
  embeddingModel: string | null;
  /** JSON-stringified array of source message IDs this fact was extracted from. */
  sourceChunkIds: string[] | null;
  /** Times this fact has been re-observed (for ranking + UX badges). */
  proofCount: number | null;
  /** How the memory was created: manual | auto-extracted | capsule. */
  source: string | null;
  /** W6 temporal lane — Unix ms when the event occurred (point/start of range). */
  eventTimeStart: number | null;
  /** W6 temporal lane — Unix ms when the event ended (range only). */
  eventTimeEnd: number | null;
  /** W6 temporal lane — `point | range | ongoing | null`. */
  eventTimeKind: string | null;
  /** When true, the user has manually set this memory's topics (entity links);
   * auto-extraction leaves them alone. False on legacy/auto rows. */
  topicsUserManaged: boolean;
  /** The memory's topics as the DURABLE, synced record — `entity` /
   * `memory_entity` are a device-local index over it. Null = pre-v42, no record
   * yet; `[]` = a record of "no topics". */
  topics: StoredTopic[] | null;
  /** Unix ms of the last `topics` write, or null if never written. Separate from
   * `updatedAt`, which topic writes deliberately pin (recall recency). */
  topicsUpdatedAt: number | null;
  /** Unix ms of the last LLM topic-extraction pass over this memory's content.
   * Null = never extracted standalone; rows that already carry entity links
   * are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).
   * DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note. */
  topicsExtractedAt: number | null;
  /** Write-time supersession (A2): id of the newer memory that replaced this
   * one (incompatible-value update, e.g. "Lives in Portland" → "Lives in SF").
   * Null = live. Superseded rows are excluded from recall/dedup by default but
   * kept for history + the read-time fallback. */
  supersededBy: string | null;
  /** Unix ms when this memory was superseded. Null when live. */
  supersededAt: number | null;
  /** Extraction-logic version this memory was last stamped under. Null (pre-v38)
   * reads as 0, so a TOPICS_EXTRACTION_VERSION bump re-extracts stale rows.
   * DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note. */
  topicsExtractedVersion: number | null;
  /** C3 re-observation watermark: Unix ms of the last retain() merge into this
   * fact. Distinct from `updatedAt` (which merges preserve). Null = never
   * re-observed since the column was added; synthesis falls back to
   * `updatedAt` in that case. */
  lastObservedAt: number | null;
  /** Typed memory (PR1) — the extractor's FactType for this fact, or null on
   * legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
   * here since the DB can hold any stored value). */
  factType: string | null;
  /** Decay archive state (PR2) — Unix ms when archived, or null when active. */
  archivedAt: number | null;
  /** Tier-0 security (PR3) — "quarantined" | "trusted" | null. */
  trustTier: string | null;
  /** People Nearby cross-user visibility. Null column reads as "private". */
  visibility: VaultMemoryVisibility;
  /** Owner opted this memory into their own digital twin even when otherwise
   * private (twin-scoped only — never indexed for matching, never displayed). */
  twinOptIn: boolean;
  /** Unix ms when visibility last became non-private; null while private. */
  publishedAt: number | null;
  /** Reserved coarse-geohash slot for landmark/Trail memories. */
  geohash: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

/**
 * Content-free projection of a vault memory, used to RANK candidates for recall
 * WITHOUT decrypting the (encrypted) `content` column. Everything here is a
 * plaintext-at-rest column — `embedding` is stored plaintext (schema v21), and
 * `folderId`/`updatedAt` drive source-filtering + tie-breaks. There is
 * deliberately NO `content` field: a ranking pass must never carry ciphertext
 * masquerading as the plaintext `StoredVaultMemory.content`. Decrypt the top-N
 * winners on demand via {@link getVaultMemoryOp}.
 */
export interface RankableVaultMemory {
  /** WatermelonDB internal ID — pass to `getVaultMemoryOp` to decrypt on demand. */
  uniqueId: string;
  /** Scope for partitioning memories (e.g., "private", "shared"). */
  scope: string;
  /** Folder ID for organization, null if unfiled. */
  folderId: string | null;
  /** JSON-stringified embedding vector, null if not yet computed. */
  embedding: string | null;
  /** Model that produced `embedding`. Null on legacy rows. */
  embeddingModel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVaultMemoryOptions {
  content: string;
  /** Scope for the memory. Defaults to "private" if omitted. */
  scope?: string;
  /** Folder ID for organization, null or omitted if unfiled */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist */
  embedding?: string;
  /** Model that produced `embedding`. Persisted alongside it so a later
   * model change can detect and re-embed stale vectors. */
  embeddingModel?: string;
  /** Source message IDs that produced this fact (auto-extraction provenance). */
  sourceChunkIds?: string[];
  /** Initial proof count. Defaults to 1 if omitted. */
  proofCount?: number;
  /** How the memory was created. Defaults to "manual" if omitted. */
  source?: string;
  /** W6 temporal lane — when the event in this memory occurred. */
  eventTime?: {
    /** Unix ms timestamp of event start (or point). */
    start: number | null;
    /** Unix ms timestamp of event end (range only). */
    end: number | null;
    /** Kind: 'point' | 'range' | 'ongoing' | null (or omit). */
    kind: "point" | "range" | "ongoing" | null;
  };
  /** Typed memory (PR1) — the extractor's classification for this fact.
   * Omit for manual/untyped saves (persisted as null). */
  factType?: FactType;
  /** Tier-0 security (PR3) — set "quarantined" when the injection screen
   * flagged this fact. Omit for the default (null/trusted). */
  trustTier?: string;
  /** People Nearby cross-user visibility. Defaults to "private" if omitted —
   * creation NEVER publishes; use {@link setMemoryVisibilityOp} so the
   * published_at bookkeeping stays consistent. Accepted here only so bulk
   * restore/import paths can round-trip an existing visibility. */
  visibility?: VaultMemoryVisibility;
  /** Round-trip slot for restore/import; see {@link visibility}. */
  publishedAt?: number | null;
  /** Coarse geohash for location-tagged memory sources (landmarks/Trail). */
  geohash?: string;
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
  /** If provided, moves the memory to this folder. */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist, or null to clear stale embedding */
  embedding?: string | null;
  /** Model that produced `embedding`. Set whenever `embedding` is written so
   * the stored model tag stays in sync with the vector. */
  embeddingModel?: string | null;
  /** Replace source-chunk-ids list (used during merge to accumulate provenance). */
  sourceChunkIds?: string[];
  /** Set an absolute proof count. Prefer {@link proofCountIncrement} for
   * re-observation paths so the read+write happens inside the writer
   * and concurrent retains can't lose updates. */
  proofCount?: number;
  /** Atomically bump proof_count by this delta inside the write block.
   * Reads the current value from the in-memory record at write time, so
   * two parallel retain() calls observe each other's commits and neither
   * loses its increment. Wins over `proofCount` when both are set. */
  proofCountIncrement?: number;
  /** Set source ("manual" | "auto-extracted" | "capsule"). */
  source?: string;
  /**
   * W6 temporal lane — write the event-time fields on update. Use during
   * auto-merge to preserve (or refine) the original event-time signal when
   * a new observation lands on an existing fact. Omit to leave the
   * existing values untouched.
   */
  eventTime?: {
    start: number | null;
    end: number | null;
    kind: "point" | "range" | "ongoing" | null;
  };
  /**
   * When true, restore the existing `updated_at` after the write so the
   * recency multiplier doesn't see a re-observation as a brand-new fact.
   * Set by auto-merge/consolidate paths — they want proof_count to bump
   * without inflating recency on top.
   */
  preserveUpdatedAt?: boolean;
  /** C3: Unix ms to stamp as the re-observation watermark (`last_observed_at`).
   * Set by retain() merge/consolidate paths so a re-observation records "seen
   * again now" without touching `updated_at` (which `preserveUpdatedAt` keeps
   * pinned). Omit to leave the existing value untouched. */
  lastObservedAt?: number;
  /** If provided, sets whether the user has taken manual control of this
   * memory's topics. Set by {@link setMemoryEntitiesOp}. */
  topicsUserManaged?: boolean;
  /** Typed memory (PR1) — set/refine the fact's classification on update.
   * Used by retain()'s lazy backfill (adopt an incoming type only when the
   * existing row has none). Omit to leave the existing value untouched. */
  factType?: FactType;
  /** Tier-0 security (PR3) — set the trust tier on update ("quarantined" |
   * "trusted"). Omit to leave the existing value untouched. */
  trustTier?: string;
  /**
   * PR5 — un-archive on re-observe. When true, clears `archived_at` (null) as
   * part of the write, resurrecting a decayed row that a new observation just
   * merged into. retain() sets this (with `preserveUpdatedAt` OFF) so the
   * restored row's decay clock resets and it doesn't immediately re-archive.
   * Omit/false to leave `archived_at` untouched.
   */
  restore?: boolean;
}
