/**
 * Deterministic synthetic corpus for the memory performance harness.
 *
 * Everything here is seeded from a single integer and built out of templates, so
 * the same config always produces byte-identical facts, vectors and entity
 * links. That matters more than realism: the harness gates on exact counts, and
 * a corpus that varies run to run turns a regression gate into a coin flip.
 *
 * Sizing: ~1000 facts is the smallest corpus where the O(n) costs the epic names
 * are unmistakable — a whole-vault load + per-row decrypt reads as ~1000 units
 * of work next to a ~30-row admission window, a difference no amount of laptop
 * noise can hide — while still fitting comfortably in an in-memory LokiJS DB.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import type { Conversation, Message } from "../../../../src/lib/db/chat/models";
import type { StorageOperationsContext } from "../../../../src/lib/db/chat/operations";
import type { MessageChunk } from "../../../../src/lib/db/chat/types";
import type { Entity, MemoryEntity } from "../../../../src/lib/db/entities/models";
import { linkMemoryEntitiesOp } from "../../../../src/lib/db/entities/operations";
import type { EntityOperationsContext } from "../../../../src/lib/db/entities/operations";
import type { VaultMemory } from "../../../../src/lib/db/memoryVault/models";
import {
  createVaultMemoriesBatchOp,
  deleteVaultMemoryOp,
} from "../../../../src/lib/db/memoryVault/operations";
import type { VaultMemoryOperationsContext } from "../../../../src/lib/db/memoryVault/operations";
import { encryptJsonField } from "../../../../src/lib/db/encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../../../../src/lib/db/schema";
import { parseQueryTimeWindow } from "../../../../src/lib/memory/queryTemporal";
import { requestEncryptionKey, type SignMessageFn } from "../../../../src/react/useEncryption";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memoryEngine/constants";

/**
 * Knobs the counters depend on. Recorded verbatim in the committed baseline so
 * `describeConfigMismatch` refuses to compare runs from a different corpus
 * instead of silently reporting a "regression" that is really a fixture change.
 */
export const PERF_CONFIG = {
  seed: 20260726,
  vaultFacts: 1000,
  /** Soft-deleted rows, i.e. the tombstone store `respectTombstones` scans. */
  deletedFacts: 60,
  /** Facts carrying entity links, i.e. the graph lane's reachable set. */
  entityLinkedFacts: 120,
  /** Facts carrying an event_time anchor inside the temporal query's window. */
  temporalFactsInWindow: 12,
  /** Facts carrying an event_time anchor well outside that window. */
  temporalFactsOutOfWindow: 180,
  chunkMessages: 300,
  chunksPerMessage: 3,
  /**
   * Production embeds at 4096 dimensions. 1024 keeps the whole suite around
   * three seconds and its heap around a couple of hundred megabytes, at the cost
   * of understating the per-vector `JSON.parse` and cosine work by ~4×. That
   * only affects the printed wall-clock, which is advisory; the gated COUNTS
   * (rows loaded, rows decrypted, vectors parsed, documents tokenized) are
   * dimension-independent and exact. 4096 was measured too — it works, and turns
   * a 3s suite into a 17s one for a number nobody gates on.
   */
  embedDim: 1024,
} as const;

/**
 * Wall-clock anchor for every scenario. Pinned (rather than `Date.now()`) so the
 * temporal lane resolves the same window on every run, and so `observationTrend`
 * labels don't drift as the baseline ages. 2026-07-15T12:00:00Z is a Wednesday
 * midday, far enough from any local midnight that a runner in a different
 * timezone still lands on the same calendar week.
 */
export const NOW = Date.UTC(2026, 6, 15, 12, 0, 0);

/** The query whose temporal window the in-window anchors are placed inside. */
export const TEMPORAL_QUERY = "What is scheduled next week with Marisol Vega?";

/**
 * Content of the fact the fixture soft-deletes last, so the tombstone scenario
 * can re-retain it and reach the `respectTombstones` scan.
 *
 * Its vocabulary is disjoint from every template below on purpose. The templates
 * collide constantly, so an ordinary corpus fact has near-identical live
 * siblings — re-retaining one would trip the 0.8 cosine auto-merge and return
 * before the tombstone gate ever runs, quietly measuring the wrong path.
 */
export const TOMBSTONE_CONTENT = "Cancelled the taxidermy subscription after the flood";

/**
 * Write-path probes. Every one shares zero content tokens with the templates or
 * with the others, so each `retain()` takes the create path rather than merging
 * into a sibling — which is what makes "ten retains, ten full-vault scans" an
 * honest measurement of write amplification instead of a merge benchmark.
 */
export const RETAIN_NOVEL_CONTENT = "Keeps a spare humidor beneath the veranda staircase";
export const RETAIN_BATCH_CONTENTS = [
  "Restrings the mandolin before every equinox",
  "Ferments plum vinegar in a stoneware crock",
  "Collects vintage barometers from estate auctions",
  "Sharpens chisels on a waterstone every fortnight",
  "Keeps a beekeeping journal in shorthand",
  "Rebuilds carburettors for a neighbour's tractor",
  "Prunes espaliered pears against the south wall",
  "Bottles elderflower cordial each solstice",
  "Repairs harpsichord jacks with quill plectra",
  "Maps disused railway cuttings on foot",
];

const MS_PER_DAY = 86_400_000;

/**
 * mulberry32 — small, fast, and (unlike `Math.random`) reproducible from a seed.
 * Only used at fixture-build time; nothing in a measured code path calls it.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string — the per-text seed for the embedder's dither. */
function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Magnitude of the per-dimension dither added to every vector.
 *
 * Without it a bag-of-words vector is ~99% zeros, which `JSON.stringify`s to a
 * single character per dimension and makes the stored-vector parse look ~50×
 * cheaper than the dense float arrays production actually stores. The dither is
 * pseudo-random per (text, dimension) and averages out, so two unrelated facts
 * still score ~0 against each other and the token signal (magnitude ~1 per
 * shared token) dominates ranking by an order of magnitude.
 */
const DITHER = 0.04;

/**
 * Deterministic stand-in for the portal embedder: a normalized bag-of-words hash
 * (identical text → identical vector, shared tokens → high cosine, disjoint text
 * → ~0) plus the density dither described above. Same shape as the embedder in
 * `src/lib/memory/roundTrip.test.ts`, at a larger dimension.
 *
 * Uses only exactly-rounded IEEE-754 operations (`Math.imul`, `Math.sqrt`, and
 * the basic arithmetic operators) — no `Math.exp`/`Math.log`, whose last-ulp
 * results are implementation-defined — so vectors are bit-identical across node
 * versions and platforms.
 */
export function embedText(text: string): number[] {
  const dim = PERF_CONFIG.embedDim;
  const v = new Array<number>(dim).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  for (const token of tokens) {
    v[hashString(token) % dim] += 1;
  }
  const rnd = mulberry32(hashString(text));
  for (let d = 0; d < dim; d++) {
    v[d] += (rnd() - 0.5) * DITHER;
  }
  let sumSq = 0;
  for (let d = 0; d < dim; d++) sumSq += v[d] * v[d];
  const norm = Math.sqrt(sumSq) || 1;
  for (let d = 0; d < dim; d++) v[d] = v[d] / norm;
  return v;
}

/** A generated fact plus the metadata the seeder needs to persist it. */
interface SyntheticFact {
  content: string;
  /** Proper nouns to link as entities — only set on the graph-lane subset. */
  entities?: string[];
  eventTime?: { start: number; end: number | null; kind: "point" };
}

// Slot fillers. Deliberately drawn from disjoint vocabularies so a query built
// out of one template's words has near-zero cosine against the others — which
// keeps every score far from `minSimilarity` (0.1) and the auto-merge threshold
// (0.8), so no counter can flip on a float that landed on a boundary.
const DRINKS = ["espresso", "matcha", "chai", "cortado", "kombucha", "horchata"];
const TIMES = ["morning", "afternoon", "evening", "weekend"];
const CITIES = ["Reykjavik", "Valparaiso", "Trondheim", "Ljubljana", "Kaohsiung", "Windhoek"];
const FOODS = ["shellfish", "peanuts", "cilantro", "aubergine", "liquorice", "wasabi"];
const TOOLS = ["Datomic", "Kicad", "Nushell", "Zellij", "Helix", "Terraform"];
const CHORES = ["invoicing", "provisioning", "benchmarking", "onboarding", "budgeting"];
const PEOPLE = [
  "Marisol Vega",
  "Bertrand Okonkwo",
  "Ingrid Halvorsen",
  "Tomasz Wierzbicki",
  "Anouk Delacroix",
  "Rashida Farouk",
  "Kwame Boateng",
  "Solveig Lindqvist",
];
const PROJECTS = ["Tidepool", "Waypoint", "Meridian", "Kestrel", "Lodestar"];

/**
 * Build the fact corpus. Facts are generated in a fixed order from a seeded PRNG
 * and deduplicated by content, so re-running with the same config produces the
 * same list — including the same entity-linked and event-time-anchored subsets,
 * which are taken as fixed-size prefixes rather than sampled.
 */
export function buildFacts(): SyntheticFact[] {
  const rnd = mulberry32(PERF_CONFIG.seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length) % xs.length];
  const window = parseQueryTimeWindow(TEMPORAL_QUERY, NOW);
  if (!window) {
    throw new Error(`perf fixture: "${TEMPORAL_QUERY}" no longer parses as a temporal query`);
  }

  const facts: SyntheticFact[] = [];
  const seen = new Set<string>();
  // Proper nouns cycle rather than being sampled: the graph lane's reachable set
  // has to be the same size for every entity name, or which name the graph query
  // happens to mention would change the counters.
  let personCursor = 0;
  let cityCursor = 0;
  const nextPerson = () => PEOPLE[personCursor++ % PEOPLE.length];
  const nextCity = () => CITIES[cityCursor++ % CITIES.length];

  for (let n = 0; n < PERF_CONFIG.vaultFacts; n++) {
    let content: string;
    let entities: string[] | undefined;
    switch (n % 6) {
      case 0:
        content = `Drinks ${pick(DRINKS)} in the ${pick(TIMES)} on ${pick(CHORES)} days`;
        break;
      case 1: {
        const person = nextPerson();
        content = `Works with ${person} on the ${pick(PROJECTS)} rollout`;
        entities = [person];
        break;
      }
      case 2: {
        const city = nextCity();
        content = `Stayed in ${city} during the ${pick(PROJECTS)} offsite`;
        entities = [city];
        break;
      }
      case 3:
        content = `Avoids ${pick(FOODS)} because of a reaction at a ${pick(CHORES)} dinner`;
        break;
      case 4:
        content = `Uses ${pick(TOOLS)} for ${pick(CHORES)} instead of the default tooling`;
        break;
      default: {
        const person = nextPerson();
        const city = nextCity();
        content = `Met ${person} in ${city} to review ${pick(PROJECTS)}`;
        entities = [person, city];
        break;
      }
    }
    // The templates collide constantly (six slots over small vocabularies), and
    // duplicate content would collapse in recall's content dedupe — making the
    // fact-lane result count depend on how many collisions the PRNG produced.
    // Suffixing with the row index is unconditionally unique.
    if (seen.has(content)) content = `${content} (${n})`;
    seen.add(content);
    facts.push(entities ? { content, entities } : { content });
  }

  // The last row is the tombstone probe (it falls inside the soft-deleted tail).
  facts[facts.length - 1] = { content: TOMBSTONE_CONTENT };

  // Entity links go on the first N facts that carry proper nouns. Fixed prefix,
  // not a sample, so the graph lane's reachable set is stable.
  let linked = 0;
  for (const fact of facts) {
    if (!fact.entities) continue;
    if (linked >= PERF_CONFIG.entityLinkedFacts) {
      delete fact.entities;
      continue;
    }
    linked++;
  }

  // Temporal anchors. In-window anchors sit in the middle 60% of the resolved
  // window so a runner in another timezone (which can shift the week boundary by
  // up to a day) still sees exactly the same rows overlap. Out-of-window anchors
  // are point events a year in the past: they exercise the indexed event-time
  // query without ever entering the result set.
  const span = window.end - window.start;
  for (let i = 0; i < PERF_CONFIG.temporalFactsInWindow; i++) {
    const at =
      window.start +
      Math.round(span * 0.2) +
      Math.round((span * 0.6 * i) / PERF_CONFIG.temporalFactsInWindow);
    facts[i].eventTime = { start: at, end: null, kind: "point" };
  }
  for (let i = 0; i < PERF_CONFIG.temporalFactsOutOfWindow; i++) {
    const at = NOW - 365 * MS_PER_DAY + i * MS_PER_DAY;
    facts[PERF_CONFIG.temporalFactsInWindow + i].eventTime = {
      start: at,
      end: null,
      kind: "point",
    };
  }

  return facts;
}

/** Contexts + collections for one seeded database. */
export interface PerfWorld {
  database: Database;
  vaultCtx: VaultMemoryOperationsContext;
  entityCtx: EntityOperationsContext;
  storageCtx: StorageOperationsContext;
  /** Ids of the facts that were soft-deleted (the tombstone store). */
  deletedIds: string[];
}

let dbCounter = 0;

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `memory-perf-${dbCounter++}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

/**
 * Create an empty world.
 *
 * `walletAddress` is set but `signMessage` is not, which is the read-only
 * decryption posture: writes stay plaintext, but every read still routes each
 * materialised row through `decryptVaultMemoryFields`. That is exactly the call
 * the harness counts — the per-row decrypt fan-out is what scales with vault
 * size, and it is what the decrypt-last path removes.
 */
export function createWorld(): PerfWorld {
  const database = makeDatabase();
  const entityCtx: EntityOperationsContext = {
    database,
    entityCollection: database.get<Entity>("entity"),
    memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
  };
  return {
    database,
    vaultCtx: {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
      walletAddress: "0xperf000000000000000000000000000000000001",
      entityCtx,
    },
    entityCtx,
    storageCtx: {
      database,
      messagesCollection: database.get<Message>("history"),
      conversationsCollection: database.get<Conversation>("conversations"),
      // Needed for the chunk column, which `seedChunks` stores encrypted
      // (sdk#880): `readJsonField` only takes its decrypt branch when an address
      // is present, so without this the seeded ciphertext would fail `JSON.parse`
      // and the chunk lane would silently see NO chunks. Still no `signMessage` —
      // reads decrypt from the key store, and adding a signer here would flip the
      // whole fixture out of its read-only posture.
      walletAddress: CHUNK_ENC_ADDRESS,
    },
    deletedIds: [],
  };
}

/**
 * Seed the vault: every fact pre-stamped with the embedder's own vector and the
 * current embedding model, so the read path exercises the stored-vector branch
 * (load + `JSON.parse`) rather than silently re-embedding the whole corpus on
 * the first search.
 */
export async function seedVault(world: PerfWorld, facts: SyntheticFact[]): Promise<string[]> {
  const created = await createVaultMemoriesBatchOp(
    world.vaultCtx,
    facts.map((f) => ({
      content: f.content,
      scope: "private",
      embedding: JSON.stringify(embedText(f.content)),
      embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
      proofCount: 1,
      source: "perf-fixture",
      ...(f.eventTime && { eventTime: f.eventTime }),
    }))
  );

  const ids = created.map((m) => m.uniqueId);
  for (let i = 0; i < facts.length; i++) {
    const names = facts[i].entities;
    if (names) await linkMemoryEntitiesOp(world.entityCtx, ids[i], names);
  }
  return ids;
}

/**
 * Soft-delete a tail slice of the vault. Deleted rows keep their content and
 * embedding — that is what makes them the tombstone store `retain()` scans when
 * `respectTombstones` is on — so this is what gives that scan something to find.
 */
export async function seedTombstones(world: PerfWorld, ids: string[]): Promise<void> {
  const doomed = ids.slice(-PERF_CONFIG.deletedFacts);
  for (const id of doomed) {
    await deleteVaultMemoryOp(world.vaultCtx, id);
    world.deletedIds.push(id);
  }
}

/**
 * Address + signer used ONLY to encrypt the seeded chunk column. Deliberately
 * not on `storageCtx` — see `seedChunks`.
 */
// Real hex, unlike the vault fixture's cosmetic "0xperf…" address: this one is
// passed to `requestEncryptionKey`, which validates the format (the vault's is
// only ever a map key, so it is never checked).
const CHUNK_ENC_ADDRESS = "0x00000000000000000000000000000000000000c2";
const chunkEncSigner = (async (message: string) =>
  `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`) as unknown as SignMessageFn;

/**
 * Seed the chunk corpus the chunk lane scans. Written straight through the
 * collection in one transaction rather than via `createMessageOp` +
 * `updateMessageChunksOp`: seeding cost is not what is being measured, and one
 * batched write keeps the fixture build off the critical path.
 *
 * The chunk column is seeded as real CIPHERTEXT (sdk#880). This matters for
 * coverage, not realism-for-its-own-sake: `readJsonField` only decrypts when
 * `isEncrypted(raw)` is true, so while this fixture wrote plaintext the chunk
 * lane's decrypt branch never executed and `chunkFieldDecrypts` was structurally
 * 0 — the gate could not see the cost of the encrypted read at all.
 *
 * Note the asymmetry with the vault, which is why only this seeder encrypts:
 * `decryptVaultMemoryFields` is called per materialised row whether or not the
 * row is ciphertext, so `vaultDecrypts` counts the fan-out honestly against
 * plaintext rows. `readJsonField` branches first. Encrypting here and nowhere
 * else keeps every vault scenario's counters untouched.
 *
 * Uses its own address + signer rather than putting them on `storageCtx`: adding
 * a `signMessage` to the shared world would flip the whole fixture out of its
 * read-only posture and move counters in scenarios that have nothing to do with
 * chunks. Reads decrypt via `ctx.walletAddress`, so the read path needs no signer.
 */
export async function seedChunks(world: PerfWorld): Promise<void> {
  const rnd = mulberry32(PERF_CONFIG.seed ^ 0x5eed);
  const convId = "perf-conversation";
  // One key derivation for the whole seed, before the write transaction — the
  // encryption below runs per message and must not derive a key 300 times, nor
  // hold the DB lock while doing crypto.
  await requestEncryptionKey(CHUNK_ENC_ADDRESS, chunkEncSigner);
  // Built outside `database.write` for the same reason: 300 encrypts inside the
  // transaction would serialise crypto against the batched insert.
  const encryptedByIndex: string[] = [];
  const contentByIndex: string[] = [];
  for (let m = 0; m < PERF_CONFIG.chunkMessages; m++) {
    const chunks: MessageChunk[] = [];
    let offset = 0;
    for (let c = 0; c < PERF_CONFIG.chunksPerMessage; c++) {
      const text =
        `We reviewed ${PROJECTS[Math.floor(rnd() * PROJECTS.length) % PROJECTS.length]} ` +
        `with ${PEOPLE[Math.floor(rnd() * PEOPLE.length) % PEOPLE.length]} and agreed to ` +
        `revisit ${CHORES[Math.floor(rnd() * CHORES.length) % CHORES.length]} in ${m}-${c}`;
      chunks.push({
        text,
        vector: embedText(text),
        startOffset: offset,
        endOffset: offset + text.length,
      });
      offset += text.length + 1;
    }
    contentByIndex.push(chunks.map((c) => c.text).join(" "));
    const encrypted = await encryptJsonField(
      chunks,
      CHUNK_ENC_ADDRESS,
      chunkEncSigner,
      undefined,
      true
    );
    // `encryptJsonField` returns undefined only for an empty value, which cannot
    // happen here — fail loudly rather than seeding a plaintext row that would
    // silently zero `chunkFieldDecrypts` and make the gate blind again.
    if (encrypted === undefined || !encrypted.startsWith("enc:")) {
      throw new Error(
        `seedChunks: chunk column did not encrypt (message ${m}) — the chunk-decrypt gate would read 0`
      );
    }
    encryptedByIndex.push(encrypted);
  }
  await world.database.write(async () => {
    await world.storageCtx.conversationsCollection.create((record) => {
      record._setRaw("conversation_id", convId);
      record._setRaw("title", "perf corpus");
      record._setRaw("is_deleted", false);
      record._setRaw("created_at", NOW);
      record._setRaw("updated_at", NOW);
    });

    const prepared = [];
    for (let m = 0; m < PERF_CONFIG.chunkMessages; m++) {
      prepared.push(
        world.storageCtx.messagesCollection.prepareCreate((record) => {
          record._setRaw("message_id", m + 1);
          record._setRaw("conversation_id", convId);
          record._setRaw("role", m % 2 === 0 ? "user" : "assistant");
          // `content` stays PLAINTEXT: the message read path resolves it through
          // `decryptMaybeJsonFieldDetailed`, which handles either, and encrypting
          // it would move counters in scenarios that aren't about chunks.
          record._setRaw("content", contentByIndex[m]);
          record._setRaw("chunks", encryptedByIndex[m]);
          record._setRaw("embedding_model", DEFAULT_API_EMBEDDING_MODEL);
          record._setRaw("created_at", NOW - (PERF_CONFIG.chunkMessages - m) * 1000);
          record._setRaw("updated_at", NOW - (PERF_CONFIG.chunkMessages - m) * 1000);
        })
      );
    }
    await world.database.batch(...prepared);
  });
}
