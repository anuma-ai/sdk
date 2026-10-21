import { normalizeEntityName } from "../../db/entities/types.js";
import { type NearbyRequest, RemoteMemoryError } from "./remotePersistence.js";

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

function topic(value: unknown): RemoteMemoryTopic {
  const t = value as Partial<RemoteMemoryTopic> | null;
  if (
    !t ||
    typeof t.name !== "string" ||
    !t.name ||
    !Number.isSafeInteger(t.version) ||
    t.version! < 1 ||
    typeof t.is_deleted !== "boolean" ||
    typeof t.server_updated_at !== "string" ||
    (t.kind !== undefined && typeof t.kind !== "string")
  )
    throw new Error("Invalid nearby topic");
  return t as RemoteMemoryTopic;
}

export function createRemoteTopicPersistence(request: NearbyRequest): RemoteTopicPersistence {
  return {
    topics: async () => {
      const out: RemoteMemoryTopic[] = [];
      let cursor: string | undefined;
      do {
        const page = (await request(
          "/topics?limit=200" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
          {}
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
    },
    putTopic: async (value, expectedVersion) => {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
        throw new Error("Expected topic version must be a nonnegative integer");
      return topic(
        await request("/topics", {
          method: "PUT",
          body: JSON.stringify({ topic: value, expected_version: expectedVersion }),
        })
      );
    },
    importTopics: async (topics, signal) => {
      for (let i = 0; i < topics.length; i += 50) {
        signal?.throwIfAborted();
        await request(
          "/topics/import",
          {
            method: "POST",
            body: JSON.stringify({ topics: topics.slice(i, i + 50) }),
          },
          signal
        );
      }
      signal?.throwIfAborted();
    },
  };
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
