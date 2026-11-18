import { v7 as uuidv7 } from "uuid";

import type { ChatSnapshot } from "./types";

/** Stores sealed values at account and `<account>/chat-cache/<uuid>` keys; `set(key, null)` deletes only that key. */
export interface ChatCacheStorage {
  get(key: string): Promise<string | null>;
  set(key: string, sealed: string | null): Promise<void>;
  /** Lists the stored keys under `prefix` and returns none once a newer storage for the same account has opened, because the cache deletes every listed slot its index does not name. */
  keys?(prefix: string): Promise<string[]>;
}

export interface ChatCacheSnapshot {
  account: string;
  cursor: string;
  records: ChatSnapshot[];
  threads: string[];
  absent: string[];
  partial?: string[];
  entries?: [string, string][];
}

const entryReadBatchSize = 16;

function groups(records: readonly ChatSnapshot[]): Map<string, ChatSnapshot[]> {
  const result = new Map<string, ChatSnapshot[]>();
  for (const snapshot of records) {
    const { record } = snapshot;
    const key =
      record.kind === "conversation" ? "conversations" : `thread/${record.conversationId}`;
    const group = result.get(key) ?? [];
    group.push(snapshot);
    result.set(key, group);
  }
  return result;
}

async function loadEntry(
  storage: ChatCacheStorage,
  account: string,
  key: string,
  slot: string,
  decrypt: (ciphertext: string) => Promise<string>
): Promise<ChatSnapshot[] | undefined> {
  if (
    typeof key !== "string" ||
    typeof slot !== "string" ||
    !slot.startsWith(`${account}/chat-cache/`)
  )
    return undefined;
  const sealed = await storage.get(slot);
  if (!sealed) return undefined;
  const entry = JSON.parse(await decrypt(sealed)) as {
    account: string;
    key: string;
    records: ChatSnapshot[];
  };
  if (entry.account !== account || entry.key !== key || !Array.isArray(entry.records))
    return undefined;
  return entry.records;
}

async function storedSlots(storage: ChatCacheStorage, account: string): Promise<string[]> {
  const prefix = `${account}/chat-cache/`;
  try {
    return (await storage.keys?.(prefix))?.filter((key) => key.startsWith(prefix)) ?? [];
  } catch {
    return [];
  }
}

export async function saveChatCache(
  storage: ChatCacheStorage,
  encrypt: (plaintext: string) => Promise<string>,
  snapshot: ChatCacheSnapshot,
  previous?: ChatCacheSnapshot,
  stored?: readonly [string, string][],
  decrypt?: (ciphertext: string) => Promise<string>
): Promise<ChatCacheSnapshot> {
  const before = groups(previous?.records ?? []);
  const slots = new Map(previous?.entries);
  const live = stored ? new Map(stored) : undefined;
  const entries: [string, string][] = [];
  const created: string[] = [];
  try {
    for (const [key, records] of groups(snapshot.records)) {
      const known = before.get(key);
      let slot = live ? live.get(key) : slots.get(key);
      let unchanged =
        slot === slots.get(key) &&
        known?.length === records.length &&
        records.every((record, index) => record === known[index]);
      if (slot && !unchanged && decrypt) {
        const current = await loadEntry(storage, snapshot.account, key, slot, decrypt).catch(
          () => undefined
        );
        const versions = new Map(
          current?.map(({ record, version }) => [`${record.kind}/${record.id}`, version])
        );
        unchanged =
          current?.length === records.length &&
          records.every(
            ({ record, version }) => versions.get(`${record.kind}/${record.id}`) === version
          );
      }
      if (!slot || !unchanged) {
        slot = `${snapshot.account}/chat-cache/${uuidv7()}`;
        created.push(slot);
        await storage.set(
          slot,
          await encrypt(JSON.stringify({ account: snapshot.account, key, records }))
        );
      }
      entries.push([key, slot]);
    }
    await storage.set(
      snapshot.account,
      await encrypt(
        JSON.stringify({
          schema: 2,
          account: snapshot.account,
          cursor: snapshot.cursor,
          threads: snapshot.threads,
          absent: snapshot.absent,
          partial: snapshot.partial ?? [],
          entries,
        })
      )
    );
  } catch (error) {
    await Promise.allSettled(created.map((slot) => storage.set(slot, null)));
    throw error;
  }
  const retained = new Set(entries.map(([, slot]) => slot));
  const replaced = new Set([
    ...(live?.values() ?? slots.values()),
    ...(await storedSlots(storage, snapshot.account)),
  ]);
  await Promise.allSettled(
    [...replaced].filter((slot) => !retained.has(slot)).map((slot) => storage.set(slot, null))
  );
  return { ...snapshot, entries };
}

export async function loadChatCache(
  storage: ChatCacheStorage,
  account: string,
  decrypt: (ciphertext: string) => Promise<string>
): Promise<ChatCacheSnapshot | undefined> {
  const sealed = await storage.get(account);
  if (!sealed) return undefined;
  const parsed = JSON.parse(await decrypt(sealed)) as Partial<ChatCacheSnapshot> & {
    schema?: number;
  };
  if (
    (parsed.schema !== 1 && parsed.schema !== 2) ||
    parsed.account !== account ||
    typeof parsed.cursor !== "string" ||
    !Array.isArray(parsed.threads) ||
    !Array.isArray(parsed.absent)
  )
    return undefined;
  if (parsed.schema === 1)
    return Array.isArray(parsed.records) ? (parsed as ChatCacheSnapshot) : undefined;
  if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.partial)) return undefined;
  const records: ChatSnapshot[] = [];
  for (let offset = 0; offset < parsed.entries.length; offset += entryReadBatchSize) {
    const loaded = await Promise.all(
      parsed.entries
        .slice(offset, offset + entryReadBatchSize)
        .map(([key, slot]) => loadEntry(storage, account, key, slot, decrypt))
    );
    for (const batch of loaded) {
      if (!batch) return undefined;
      records.push(...batch);
    }
  }
  return {
    account,
    cursor: parsed.cursor,
    records,
    threads: parsed.threads,
    absent: parsed.absent,
    partial: parsed.partial,
    entries: parsed.entries,
  };
}

export async function storedChatCacheEntries(
  storage: ChatCacheStorage,
  account: string,
  decrypt: (ciphertext: string) => Promise<string>
): Promise<[string, string][]> {
  const sealed = await storage.get(account);
  const parsed = sealed
    ? await decrypt(sealed)
        .then((plaintext) => JSON.parse(plaintext) as Partial<ChatCacheSnapshot>)
        .catch(() => undefined)
    : undefined;
  if (parsed?.account !== account || !Array.isArray(parsed.entries)) return [];
  return parsed.entries.filter(
    (entry): entry is [string, string] =>
      Array.isArray(entry) &&
      typeof entry[0] === "string" &&
      typeof entry[1] === "string" &&
      entry[1].startsWith(`${account}/chat-cache/`)
  );
}

export async function clearChatCache(
  storage: ChatCacheStorage,
  account: string,
  decrypt: (ciphertext: string) => Promise<string>,
  previous?: ChatCacheSnapshot
): Promise<void> {
  const slots = new Set(previous?.entries?.map(([, slot]) => slot));
  for (const [, slot] of await storedChatCacheEntries(storage, account, decrypt)) slots.add(slot);
  for (const slot of await storedSlots(storage, account)) slots.add(slot);
  await storage.set(account, null);
  await Promise.all([...slots].map((slot) => storage.set(slot, null)));
}
