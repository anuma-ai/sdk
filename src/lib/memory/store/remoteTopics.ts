import { normalizeEntityName } from "../../db/entities/types.js";
import { getLogger } from "../../logger.js";
import { type NearbyRequest, RemoteMemoryError } from "./remotePersistence.js";
import type { TopicCodec } from "./topicCodec.js";

/** @public */
export interface RemoteMemoryTopic {
  name: string;
  kind?: string;
  version: number;
  is_deleted: boolean;
  server_updated_at: string;
}

/** @public */
export interface RemoteTopicPersistence {
  topics(): Promise<RemoteMemoryTopic[]>;
  putTopic(
    topic: Pick<RemoteMemoryTopic, "name" | "kind" | "is_deleted">,
    expectedVersion: number
  ): Promise<RemoteMemoryTopic>;
  importTopics(
    topics: readonly { name: string; kind?: string }[],
    signal?: AbortSignal
  ): Promise<void>;
}

interface WireTopic extends RemoteMemoryTopic {
  name_hash?: string;
}

function topic(value: unknown): WireTopic {
  const t = value as Partial<WireTopic> | null;
  if (
    !t ||
    typeof t.name !== "string" ||
    !t.name ||
    (t.name_hash !== undefined && typeof t.name_hash !== "string") ||
    !Number.isSafeInteger(t.version) ||
    t.version! < 1 ||
    typeof t.is_deleted !== "boolean" ||
    typeof t.server_updated_at !== "string" ||
    (t.kind !== undefined && typeof t.kind !== "string")
  )
    throw new Error("Invalid nearby topic");
  return t as WireTopic;
}

async function wireTopics(request: NearbyRequest, signal?: AbortSignal): Promise<WireTopic[]> {
  const out: WireTopic[] = [];
  let cursor: string | undefined;
  do {
    const page = (await request(
      "/topics?limit=200" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
      {},
      signal
    )) as { items?: unknown; next_cursor?: unknown };
    if (
      !Array.isArray(page.items) ||
      (page.next_cursor !== undefined && typeof page.next_cursor !== "string")
    )
      throw new Error("Invalid nearby topic page");
    out.push(...page.items.map(topic));
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}

function hashesOf(items: readonly WireTopic[]): Set<string> {
  return new Set(items.flatMap((t) => (t.name_hash === undefined ? [] : [t.name_hash])));
}

async function sealedImport(
  request: NearbyRequest,
  codec: TopicCodec,
  topics: readonly { name: string; kind?: string; is_deleted?: boolean }[],
  signal?: AbortSignal
): Promise<void> {
  for (let i = 0; i < topics.length; i += 50) {
    signal?.throwIfAborted();
    const sealed = (
      await Promise.all(topics.slice(i, i + 50).map((t) => codec.encodeCatalog(t)))
    ).filter((t) => t !== null);
    if (sealed.length)
      await request(
        "/topics/import",
        { method: "POST", body: JSON.stringify({ topics: sealed }) },
        signal
      );
  }
  signal?.throwIfAborted();
}

export function createRemoteTopicPersistence(
  request: NearbyRequest,
  codec: TopicCodec
): RemoteTopicPersistence {
  let legacyOnly = new Set<string>();
  return {
    topics: async () => {
      const items = await wireTopics(request);
      const hashed = hashesOf(items);
      const legacy = new Set<string>();
      const decoded = await Promise.all(
        items.map(async (item) => {
          if (item.name_hash === undefined) {
            const hash = await codec.hash(item.name);
            if (hash !== null && hashed.has(hash)) return null;
            legacy.add(normalizeEntityName(item.name));
          }
          const plain = await codec.decodeCatalog(item);
          return { ...plain, name: normalizeEntityName(plain.name) };
        })
      );
      legacyOnly = legacy;
      return decoded.filter((t) => t !== null);
    },
    putTopic: async (value, expectedVersion) => {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
        throw new Error("Expected topic version must be a nonnegative integer");
      const sealed = await codec.encodeCatalog(value);
      if (!sealed) throw new Error("Topic name must not be empty");
      const saved = topic(
        await request("/topics", {
          method: "PUT",
          body: JSON.stringify({
            topic: sealed,
            expected_version: legacyOnly.has(normalizeEntityName(value.name)) ? 0 : expectedVersion,
          }),
        })
      );
      const decoded = await codec.decodeCatalog(saved);
      legacyOnly.delete(decoded.name);
      return decoded;
    },
    importTopics: (topics, signal) =>
      sealedImport(
        request,
        codec,
        topics.map(({ name, kind }) => ({ name, ...(kind !== undefined && { kind }) })),
        signal
      ),
  };
}

async function retireLegacyTopics(
  request: NearbyRequest,
  codec: TopicCodec,
  topics: readonly WireTopic[],
  imported: ReadonlySet<string>,
  signal?: AbortSignal
): Promise<void> {
  const failures: unknown[] = [];
  const put = async (topic: unknown, expectedVersion: number) => {
    try {
      await request(
        "/topics",
        { method: "PUT", body: JSON.stringify({ topic, expected_version: expectedVersion }) },
        signal
      );
      return "saved";
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof RemoteMemoryError && error.status === 409) return "conflict";
      failures.push(error);
      return "failed";
    }
  };
  const retire = (item: WireTopic) =>
    put(
      { name: item.name, ...(item.kind !== undefined && { kind: item.kind }), is_deleted: true },
      item.version
    );
  const changed: WireTopic[] = [];
  for (const item of topics) {
    signal?.throwIfAborted();
    if ((await retire(item)) === "conflict") changed.push(item);
  }
  if (changed.length) {
    const current = await wireTopics(request, signal);
    for (const stale of changed) {
      const hash = await codec.hash(stale.name);
      const legacy = current.find((t) => t.name_hash === undefined && t.name === stale.name);
      const copy = current.find((t) => t.name_hash !== undefined && t.name_hash === hash);
      if (!legacy || !copy || hash === null) continue;
      const newer =
        imported.has(hash) ||
        Date.parse(legacy.server_updated_at) > Date.parse(copy.server_updated_at);
      if (newer && (legacy.is_deleted !== copy.is_deleted || legacy.kind !== copy.kind)) {
        const sealed = await codec.encodeCatalog({
          name: legacy.name,
          ...(legacy.kind !== undefined && { kind: legacy.kind }),
          is_deleted: legacy.is_deleted,
        });
        if (!sealed || (await put(sealed, copy.version)) !== "saved") continue;
      }
      if (!legacy.is_deleted) await retire(legacy);
    }
  }
  if (failures.length)
    getLogger().warn(
      `[memory/remote] Could not retire ${failures.length} upgraded topic catalog entries:`,
      failures[0]
    );
}

export async function upgradeLegacyTopicCatalog(
  request: NearbyRequest,
  codec: TopicCodec,
  signal?: AbortSignal
): Promise<number> {
  const items = await wireTopics(request, signal);
  const hashed = hashesOf(items);
  const hashes = await Promise.all(
    items.map(async (item) => (item.name_hash === undefined ? codec.hash(item.name) : null))
  );
  const sources = new Map<string, WireTopic>();
  const live: WireTopic[] = [];
  items.forEach((item, i) => {
    const hash = hashes[i];
    if (hash === null) return;
    if (!item.is_deleted) live.push(item);
    if (hashed.has(hash)) return;
    const source = sources.get(hash);
    if (!source || (source.is_deleted && !item.is_deleted)) sources.set(hash, item);
  });
  const legacy = [...sources.values()].map((item) => ({
    name: item.name,
    ...(item.kind !== undefined && { kind: item.kind }),
    ...(item.is_deleted && { is_deleted: true }),
  }));
  await sealedImport(request, codec, legacy, signal);
  await retireLegacyTopics(request, codec, live, new Set(sources.keys()), signal);
  return legacy.length;
}

export async function createRemoteTopic(
  persistence: RemoteTopicPersistence,
  name: string
): Promise<string | null> {
  const canonical = normalizeEntityName(name);
  if (!canonical) return null;
  const existing = (await persistence.topics()).find((t) => t.name === canonical);
  if (existing && !existing.is_deleted) return canonical;
  try {
    await persistence.putTopic(
      { name: canonical, is_deleted: false, ...(existing?.kind && { kind: existing.kind }) },
      existing?.version ?? 0
    );
  } catch (error) {
    if (!(error instanceof RemoteMemoryError) || error.code !== "version_conflict") throw error;
    const current = (await persistence.topics()).find((t) => t.name === canonical);
    if (!current || current.is_deleted) throw error;
  }
  return canonical;
}
