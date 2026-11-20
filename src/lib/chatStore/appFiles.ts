import { normalizePath } from "../../utils/paths.js";
import {
  type ChatJson,
  type ChatRecordKind,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
} from "./types.js";
import type { VaultAttachments } from "./vaultAttachments.js";

export interface AppFile {
  conversationId: string;
  path: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface SavedToolData {
  name: string;
  displayName: string;
  description: string;
  parameters: string;
  html: string;
  conversationId: string | null;
}

export interface SavedTool extends SavedToolData {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

const maxSaveAttempts = 3;

/** The vault record id of a conversation's file: a keyed hash, so vault cannot tell the path. */
export async function appFileId(
  store: Pick<ChatStore, "sealedId">,
  conversationId: string,
  path: string
): Promise<string> {
  if (!store.sealedId) throw new Error("App file ids need a chat store that seals ids");
  return store.sealedId(`app_file\u0000${conversationId}\u0000${normalizePath(path)}`);
}

async function putLatest(
  store: ChatStore,
  target: { kind: ChatRecordKind; id: string; conversationId: string },
  next: { data: { [key: string]: ChatJson }; isDeleted: boolean },
  signal?: AbortSignal
): Promise<{ saved: ChatSnapshot | null; replaced: ChatSnapshot | null }> {
  for (let attempt = 1; ; attempt++) {
    const current = await store.get(target.kind, target.id, signal);
    if (next.isDeleted && (!current || current.record.isDeleted))
      return { saved: current, replaced: current };
    const now = Date.now();
    try {
      const [saved] = await store.putMany(
        [
          {
            record: {
              ...target,
              sortKey: 0,
              createdAt: current?.record.createdAt ?? now,
              updatedAt: Math.max(now, (current?.record.updatedAt ?? 0) + 1),
              isDeleted: next.isDeleted,
              data: next.isDeleted ? {} : next.data,
            },
            expectedVersion: current?.version ?? 0,
          },
        ],
        signal
      );
      return { saved, replaced: current };
    } catch (error) {
      if (
        !(error instanceof ChatStoreError) ||
        error.code !== "version_conflict" ||
        attempt >= maxSaveAttempts
      )
        throw error;
    }
  }
}

async function listAll(
  store: ChatStore,
  kind: ChatRecordKind,
  conversationId: string | undefined,
  signal?: AbortSignal
): Promise<ChatSnapshot[]> {
  const out: ChatSnapshot[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list({ kind, conversationId, limit: 100, cursor, signal });
    out.push(...page.items.filter((item) => !item.record.isDeleted));
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

async function toAppFile(
  snapshot: ChatSnapshot,
  attachments?: VaultAttachments,
  signal?: AbortSignal
): Promise<AppFile | null> {
  const { path, content, attachmentId } = snapshot.record.data;
  if (typeof path !== "string") return null;
  let text = typeof content === "string" ? content : null;
  if (text === null && typeof attachmentId === "string" && attachments) {
    const bytes = await attachments.read(attachmentId, signal).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return null;
    });
    if (bytes) text = new TextDecoder().decode(bytes);
  }
  if (text === null) return null;
  return {
    conversationId: snapshot.record.conversationId,
    path,
    content: text,
    version: snapshot.version,
    createdAt: snapshot.record.createdAt,
    updatedAt: snapshot.record.updatedAt,
  };
}

async function resolveAppFiles(
  items: readonly ChatSnapshot[],
  attachments?: VaultAttachments,
  signal?: AbortSignal
): Promise<AppFile[]> {
  const files: AppFile[] = [];
  for (const item of items) {
    const file = await toAppFile(item, attachments, signal);
    if (file) files.push(file);
  }
  return files;
}

function toSavedTool(snapshot: ChatSnapshot): SavedTool | null {
  const d = snapshot.record.data;
  if (
    typeof d.name !== "string" ||
    typeof d.displayName !== "string" ||
    typeof d.description !== "string" ||
    typeof d.parameters !== "string" ||
    typeof d.html !== "string" ||
    (d.conversationId !== null && typeof d.conversationId !== "string")
  )
    return null;
  return {
    id: snapshot.record.id,
    name: d.name,
    displayName: d.displayName,
    description: d.description,
    parameters: d.parameters,
    html: d.html,
    conversationId: d.conversationId,
    version: snapshot.version,
    createdAt: snapshot.record.createdAt,
    updatedAt: snapshot.record.updatedAt,
  };
}

/** Every live file of one conversation; pass `attachments` to read files stored as vault attachments. */
export async function listAppFiles(
  store: ChatStore,
  conversationId: string,
  signal?: AbortSignal,
  attachments?: VaultAttachments
): Promise<AppFile[]> {
  return resolveAppFiles(
    await listAll(store, "app_file", conversationId, signal),
    attachments,
    signal
  );
}

export interface AppFileIndex {
  /** Every live file of every conversation, fetching only what changed since the last call. */
  list(signal?: AbortSignal): Promise<AppFile[]>;
}

/** Keeps every app file of the account current from the changes feed; pass `attachments` to read files stored as vault attachments. */
export function createAppFileIndex(store: ChatStore, attachments?: VaultAttachments): AppFileIndex {
  const latest = new Map<string, ChatSnapshot>();
  let cursor: string | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const catchUp = async (signal?: AbortSignal) => {
    for (;;) {
      const page = await store.changes(cursor, { kinds: ["app_file"], limit: 200, signal });
      for (const item of page.items) latest.set(item.record.id, item);
      cursor = page.nextCursor ?? page.changesCursor;
      if (!page.nextCursor) break;
    }
    return resolveAppFiles(
      [...latest.values()].filter((item) => !item.record.isDeleted),
      attachments,
      signal
    );
  };
  return {
    list(signal) {
      const next = queue.then(() => catchUp(signal));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

/** Every live file of every conversation, read from the changes feed. */
export function listEveryAppFile(
  store: ChatStore,
  signal?: AbortSignal,
  attachments?: VaultAttachments
): Promise<AppFile[]> {
  return createAppFileIndex(store, attachments).list(signal);
}

/** One conversation file, or null when vault holds none at that path. */
export async function getAppFile(
  store: ChatStore,
  conversationId: string,
  path: string,
  signal?: AbortSignal,
  attachments?: VaultAttachments
): Promise<AppFile | null> {
  const snapshot = await store.get(
    "app_file",
    await appFileId(store, conversationId, path),
    signal
  );
  return snapshot && !snapshot.record.isDeleted ? toAppFile(snapshot, attachments, signal) : null;
}

function tooLarge(error: unknown): boolean {
  return error instanceof ChatStoreError && error.code === "record_too_large";
}

/** Creates or replaces a conversation file, the last save of a path winning across devices; with `attachments`, a file too large for one record becomes a vault attachment when vault supports it. */
export async function saveAppFile(
  store: ChatStore,
  file: { conversationId: string; path: string; content: string },
  signal?: AbortSignal,
  attachments?: VaultAttachments
): Promise<AppFile> {
  const target = {
    kind: "app_file" as const,
    id: await appFileId(store, file.conversationId, file.path),
    conversationId: file.conversationId,
  };
  const path = normalizePath(file.path);
  let attachmentId: string | undefined;
  let written: { saved: ChatSnapshot | null; replaced: ChatSnapshot | null };
  try {
    written = await putLatest(
      store,
      target,
      { data: { path, content: file.content }, isDeleted: false },
      signal
    );
  } catch (error) {
    if (!tooLarge(error) || !attachments || !store.mediaAttachments) throw error;
    attachmentId = await attachments.upload(new TextEncoder().encode(file.content), { signal });
    const owner = { kind: "app_file" as const, id: target.id };
    try {
      written = await putLatest(
        store,
        target,
        { data: { path, attachmentId }, isDeleted: false },
        signal
      );
    } catch (failure) {
      const stored = await store.get("app_file", target.id).catch(() => undefined);
      if (stored?.record.data.attachmentId === attachmentId)
        await attachments.commit(attachmentId, owner).catch(() => undefined);
      else if (stored !== undefined) await attachments.delete(attachmentId).catch(() => undefined);
      throw failure;
    }
    await attachments.commit(attachmentId, owner);
  }
  const superseded = written.replaced?.record.data.attachmentId;
  if (typeof superseded === "string" && superseded !== attachmentId)
    await (attachments ?? store.attachments).delete(superseded).catch(() => undefined);
  const saved = written.saved as ChatSnapshot;
  return {
    conversationId: file.conversationId,
    path,
    content: file.content,
    version: saved.version,
    createdAt: saved.record.createdAt,
    updatedAt: saved.record.updatedAt,
  };
}

export async function deleteAppFile(
  store: ChatStore,
  conversationId: string,
  path: string,
  signal?: AbortSignal
): Promise<void> {
  await putLatest(
    store,
    { kind: "app_file", id: await appFileId(store, conversationId, path), conversationId },
    { data: {}, isDeleted: true },
    signal
  );
}

export async function loadSavedTools(store: ChatStore, signal?: AbortSignal): Promise<SavedTool[]> {
  const items = await listAll(store, "saved_tool", undefined, signal);
  return items.map(toSavedTool).filter((tool): tool is SavedTool => tool !== null);
}

/** Creates or replaces a saved tool; the last save wins across devices. */
export async function saveSavedTool(
  store: ChatStore,
  id: string,
  tool: SavedToolData,
  signal?: AbortSignal
): Promise<SavedTool> {
  const { saved } = await putLatest(
    store,
    { kind: "saved_tool", id, conversationId: "" },
    { data: { ...tool }, isDeleted: false },
    signal
  );
  return toSavedTool(saved as ChatSnapshot) as SavedTool;
}

export async function deleteSavedTool(
  store: ChatStore,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  await putLatest(
    store,
    { kind: "saved_tool", id, conversationId: "" },
    { data: {}, isDeleted: true },
    signal
  );
}
