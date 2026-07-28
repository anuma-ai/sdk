/**
 * The recognized entity classifications. Runtime list + derived type kept
 * in one place so the extractor's validation and the `EntityKind` union
 * can't drift apart.
 * @public
 */
export const ENTITY_KINDS = [
  "person",
  "organization",
  "place",
  "event",
  "product",
  "thing",
  "concept",
  "other",
] as const;

/** @public */
export type EntityKind = (typeof ENTITY_KINDS)[number];

/**
 * Single canonicalization rule for entity names. Used by both the write
 * side (`linkMemoryEntitiesOp` / `upsertEntitiesInWrite`) and the query side
 * (`extractQueryEntities`) so lookup parity stays guaranteed even if the
 * rule evolves (e.g. Unicode normalization, hyphen collapse).
 */
export function normalizeEntityName(name: string): string {
  return name.trim().toLowerCase();
}

export interface StoredEntity {
  uniqueId: string;
  canonicalName: string;
  kind: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Who put a topic on a memory. Written to `memory_vault.topics` but not yet
 * READ anywhere — it exists so a later improvement can refresh the `auto`
 * entries of a curated memory while leaving `user` entries alone (today
 * `topics_user_managed` is all-or-nothing per memory) without needing a second
 * migration or backfill. Don't build that behavior off it yet.
 *
 * When you do: a value written by the v42 backfill is NOT ground truth. Pre-v42
 * rows carry no per-topic provenance, so `backfillMemoryTopicsOp` derives it
 * from the per-memory `topics_user_managed` flag and stamps a curated legacy
 * row's every topic `user` — see the note at that derivation.
 * @public
 */
export type TopicSource = "user" | "auto";

/**
 * One entry in `memory_vault.topics` — the durable, synced record of a memory's
 * topics. `name` carries the CALLER's display casing, unlike
 * {@link StoredEntity.canonicalName}, which {@link normalizeEntityName}
 * lowercases and which has no display column: preserving casing here is the
 * point of storing names on the memory row.
 * @public
 */
export interface StoredTopic {
  name: string;
  kind?: string;
  source: TopicSource;
}

/** Serialize topics for the `memory_vault.topics` column. */
export function serializeTopics(topics: readonly StoredTopic[]): string {
  return JSON.stringify(topics);
}

/**
 * Read the `memory_vault.topics` column.
 *
 * Returns `null` for a NULL/absent/unparseable column — "no record yet", the
 * pre-v42 shape the sweep's backfill bucket targets — and `[]` for a stored
 * empty array, which is a RECORD of "this memory has no topics". Callers must
 * keep the two apart: collapsing them would make every deliberately-topicless
 * memory a permanent backfill candidate.
 */
export function parseTopics(value: unknown): StoredTopic[] | null {
  if (typeof value !== "string" || value.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out: StoredTopic[] = [];
  for (const raw of parsed) {
    if (typeof raw !== "object" || raw === null) continue;
    const { name, kind, source } = raw as Record<string, unknown>;
    if (typeof name !== "string" || name.trim().length === 0) continue;
    out.push({
      name,
      ...(typeof kind === "string" && kind.length > 0 ? { kind } : {}),
      source: source === "user" ? "user" : "auto",
    });
  }
  return out;
}

/** @public */
export interface CreateEntityOptions {
  canonicalName: string;
  kind?: EntityKind | (string & {});
}

// StoredMemoryEntity (the converted shape of MemoryEntity rows) was
// removed alongside the W5 graph-lane read helpers — reintroduce when
// the read path needs it again.
