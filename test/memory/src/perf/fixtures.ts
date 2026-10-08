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
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../../../../src/lib/db/schema";
import { parseQueryTimeWindow } from "../../../../src/lib/memory/queryTemporal";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../../src/lib/memoryEngine/constants";

export const PERF_CONFIG = {
  seed: 20260726,
  vaultFacts: 1000,
  deletedFacts: 60,
  entityLinkedFacts: 120,
  temporalFactsInWindow: 12,
  temporalFactsOutOfWindow: 180,
  chunkMessages: 300,
  chunksPerMessage: 3,
  embedDim: 1024,
} as const;

export const NOW = Date.UTC(2026, 6, 15, 12, 0, 0);

export const TEMPORAL_QUERY = "What is scheduled next week with Marisol Vega?";

export const TOMBSTONE_CONTENT = "Cancelled the taxidermy subscription after the flood";

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

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const DITHER = 0.04;

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

interface SyntheticFact {
  content: string;
  entities?: string[];
  eventTime?: { start: number; end: number | null; kind: "point" };
}

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

export function buildFacts(): SyntheticFact[] {
  const rnd = mulberry32(PERF_CONFIG.seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length) % xs.length];
  const window = parseQueryTimeWindow(TEMPORAL_QUERY, NOW);
  if (!window) {
    throw new Error(`perf fixture: "${TEMPORAL_QUERY}" no longer parses as a temporal query`);
  }

  const facts: SyntheticFact[] = [];
  const seen = new Set<string>();
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
    if (seen.has(content)) content = `${content} (${n})`;
    seen.add(content);
    facts.push(entities ? { content, entities } : { content });
  }

  facts[facts.length - 1] = { content: TOMBSTONE_CONTENT };

  let linked = 0;
  for (const fact of facts) {
    if (!fact.entities) continue;
    if (linked >= PERF_CONFIG.entityLinkedFacts) {
      delete fact.entities;
      continue;
    }
    linked++;
  }

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

export interface PerfWorld {
  database: Database;
  vaultCtx: VaultMemoryOperationsContext;
  entityCtx: EntityOperationsContext;
  storageCtx: StorageOperationsContext;
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
    },
    deletedIds: [],
  };
}

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

export async function seedTombstones(world: PerfWorld, ids: string[]): Promise<void> {
  const doomed = ids.slice(-PERF_CONFIG.deletedFacts);
  for (const id of doomed) {
    await deleteVaultMemoryOp(world.vaultCtx, id);
    world.deletedIds.push(id);
  }
}

export async function seedChunks(world: PerfWorld): Promise<void> {
  const rnd = mulberry32(PERF_CONFIG.seed ^ 0x5eed);
  const convId = "perf-conversation";
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
      const content = chunks.map((c) => c.text).join(" ");
      prepared.push(
        world.storageCtx.messagesCollection.prepareCreate((record) => {
          record._setRaw("message_id", m + 1);
          record._setRaw("conversation_id", convId);
          record._setRaw("role", m % 2 === 0 ? "user" : "assistant");
          record._setRaw("content", content);
          record._setRaw("chunks", JSON.stringify(chunks));
          record._setRaw("embedding_model", DEFAULT_API_EMBEDDING_MODEL);
          record._setRaw("created_at", NOW - (PERF_CONFIG.chunkMessages - m) * 1000);
          record._setRaw("updated_at", NOW - (PERF_CONFIG.chunkMessages - m) * 1000);
        })
      );
    }
    await world.database.batch(...prepared);
  });
}
