export type ChatRecordKind =
  | "conversation"
  | "message"
  | "summary"
  | "project"
  | "memory_links"
  | "setting"
  | "app_file"
  | "saved_tool"
  | "media";

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
  /** Sent and stored unencrypted so vault can run vector search. */
  embeddings?: number[][];
  embeddingModel?: string;
}

export interface ChatRef {
  kind: ChatRecordKind;
  id: string;
}

export type ChatAccountState = "none" | "migrating" | "active";

export interface ChatAccount {
  keyId: string;
  state: ChatAccountState;
  recordCount: number;
  storageBytes: number;
  vectorCount: number;
  /** The newest change; read it before loading history and poll `changes` from it. Absent before the first record. */
  changesCursor?: string;
}

export interface ChatImport {
  record: ChatRecord;
  /** Sent and stored unencrypted so vault can run vector search. */
  embeddings?: number[][];
  embeddingModel?: string;
}

export interface ChatRevision {
  kind: ChatRecordKind;
  id: string;
  updatedAt: number;
  isDeleted: boolean;
}

export interface ChatChanges {
  items: ChatSnapshot[];
  nextCursor?: string;
  changesCursor: string;
}

export interface ChatSearchOptions {
  limit?: number;
  kinds?: ("message" | "summary")[];
  conversationId?: string;
  excludeConversationId?: string;
  /** Ranks only vectors from this model; vectors stored without one always count. */
  embeddingModel?: string;
  signal?: AbortSignal;
}

export interface ChatTermSearchOptions {
  limit?: number;
  kinds?: ("message" | "summary")[];
  conversationId?: string;
  excludeConversationId?: string;
  cursor?: string;
  signal?: AbortSignal;
}

export interface ChatTermsPage {
  indexed: number;
  nextCursor?: string;
}

export interface ChatSearchHit extends ChatSnapshot {
  chunk: number;
  score: number;
}

export interface ChatAttachment {
  id: string;
  sizeBytes: number;
  state: "pending" | "committed";
  ownerKind?: ChatAttachmentOwnerKind;
  ownerId?: string;
  createdAt: string;
  committedAt?: string;
}

export type ChatAttachmentOwnerKind = "message" | "summary" | "media" | "app_file";

export interface ChatPresignedUrl {
  url: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface ChatAttachments {
  create(
    sizeBytes: number,
    signal?: AbortSignal
  ): Promise<{ attachment: ChatAttachment; upload: ChatPresignedUrl }>;
  commit(
    attachmentId: string,
    owner: { kind: ChatAttachmentOwnerKind; id: string },
    signal?: AbortSignal
  ): Promise<ChatAttachment>;
  get(
    attachmentId: string,
    signal?: AbortSignal
  ): Promise<{ attachment: ChatAttachment; download?: ChatPresignedUrl } | null>;
  delete(attachmentId: string, signal?: AbortSignal): Promise<void>;
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
  total?: number;
}

/** Explicit versions protect edits; ambiguous writes are never replayed automatically. */
export interface ChatStore {
  get(kind: ChatRecordKind, id: string, signal?: AbortSignal): Promise<ChatSnapshot | null>;
  list(options: ChatListOptions): Promise<ChatPage>;
  putMany(writes: readonly ChatWrite[], signal?: AbortSignal): Promise<ChatSnapshot[]>;
  getMany(refs: readonly ChatRef[], signal?: AbortSignal): Promise<ChatSnapshot[]>;
  account(signal?: AbortSignal): Promise<ChatAccount>;
  takeConnectedAccount?(): ChatAccount | undefined;
  importRecords(records: readonly ChatImport[], signal?: AbortSignal): Promise<number>;
  verify(revisions: readonly ChatRevision[], signal?: AbortSignal): Promise<ChatRef[]>;
  activate(signal?: AbortSignal): Promise<boolean>;
  /** Without `kinds`, vault returns every kind except `setting`. */
  changes(
    cursor?: string,
    options?: { limit?: number; kinds?: readonly ChatRecordKind[]; signal?: AbortSignal }
  ): Promise<ChatChanges>;
  search(embedding: readonly number[], options?: ChatSearchOptions): Promise<ChatSearchHit[]>;
  /** Messages and summaries holding every word of `query`, newest first; present when vault keeps keyed word hashes. */
  searchTerms?(query: string, options?: ChatTermSearchOptions): Promise<ChatPage>;
  /** Stores word hashes for one page of records vault has none for; call again with `nextCursor` until it is absent. */
  indexTermsPage?(cursor?: string, signal?: AbortSignal): Promise<ChatTermsPage>;
  deleteAll(signal?: AbortSignal): Promise<number>;
  /** A keyed hash vault cannot reproduce, for record ids derived from private names. */
  sealedId?(value: string): Promise<string>;
  /** True when vault stores `media` records and attachments owned by `media` and `app_file` records. */
  mediaAttachments?: boolean;
  attachments: ChatAttachments;
}

export interface RemoteChatStoreOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  keyId: string;
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
  hashTopic?: (normalized: string) => Promise<string>;
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
