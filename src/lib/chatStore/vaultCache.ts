import type { ChatSnapshot } from "./types";

/** Durable home for each account's sealed chat cache; `set(account, null)` deletes that account's entry. */
export interface ChatCacheStorage {
  get(account: string): Promise<string | null>;
  set(account: string, sealed: string | null): Promise<void>;
}

export interface ChatCacheSnapshot {
  account: string;
  cursor: string;
  records: ChatSnapshot[];
  threads: string[];
  absent: string[];
}

export async function saveChatCache(
  storage: ChatCacheStorage,
  encrypt: (plaintext: string) => Promise<string>,
  snapshot: ChatCacheSnapshot
): Promise<void> {
  await storage.set(snapshot.account, await encrypt(JSON.stringify({ schema: 1, ...snapshot })));
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
    parsed.schema !== 1 ||
    parsed.account !== account ||
    typeof parsed.cursor !== "string" ||
    !Array.isArray(parsed.records) ||
    !Array.isArray(parsed.threads) ||
    !Array.isArray(parsed.absent)
  )
    return undefined;
  return {
    account,
    cursor: parsed.cursor,
    records: parsed.records,
    threads: parsed.threads,
    absent: parsed.absent,
  };
}
