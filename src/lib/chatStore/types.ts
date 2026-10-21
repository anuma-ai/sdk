export type ChatRecordKind = "conversation" | "message" | "summary" | "project" | "memory_links";

export type ChatJson = null | boolean | number | string | ChatJson[] | { [key: string]: ChatJson };

/** Whole-record JSON data is encrypted on the device, including all text, vectors and tool events. */
export interface ChatRecord {
  kind: ChatRecordKind;
  id: string;
  conversationId: string;
  sortKey: number;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  data: { [key: string]: ChatJson };
}

export interface ChatSnapshot {
  record: ChatRecord;
  version: number;
  serverUpdatedAt: string;
}

export interface ChatWrite {
  record: ChatRecord;
  expectedVersion: number;
}

export interface ChatListOptions {
  kind: ChatRecordKind;
  conversationId?: string;
  includeDeleted?: boolean;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface ChatPage {
  items: ChatSnapshot[];
  nextCursor?: string;
}

/** Explicit versions protect edits; ambiguous writes are never replayed automatically. */
export interface ChatStore {
  get(kind: ChatRecordKind, id: string, signal?: AbortSignal): Promise<ChatSnapshot | null>;
  list(options: ChatListOptions): Promise<ChatPage>;
  putMany(writes: readonly ChatWrite[], signal?: AbortSignal): Promise<ChatSnapshot[]>;
}

export interface RemoteChatStoreOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  keyId: string;
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class ChatStoreError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "ChatStoreError";
  }
}
