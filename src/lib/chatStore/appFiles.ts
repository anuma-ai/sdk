import { normalizePath } from "../../utils/paths.js";
import {
  type ChatJson,
  type ChatRecordKind,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
} from "./types.js";

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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The vault record id of a conversation's file: a hash, so the path itself stays sealed. */
export function appFileId(conversationId: string, path: string): Promise<string> {
  return sha256Hex(`${conversationId}\u0000${normalizePath(path)}`);
}

async function putLatest(
  store: ChatStore,
  target: { kind: ChatRecordKind; id: string; conversationId: string },
  next: { data: { [key: string]: ChatJson }; isDeleted: boolean },
  signal?: AbortSignal
): Promise<ChatSnapshot | null> {
  for (let attempt = 1; ; attempt++) {
    const current = await store.get(target.kind, target.id, signal);
    if (next.isDeleted && (!current || current.record.isDeleted)) return current;
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
      return saved;
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

function toAppFile(snapshot: ChatSnapshot): AppFile | null {
  const { path, content } = snapshot.record.data;
  if (typeof path !== "string" || typeof content !== "string") return null;
  return {
    conversationId: snapshot.record.conversationId,
    path,
    content,
    version: snapshot.version,
    createdAt: snapshot.record.createdAt,
    updatedAt: snapshot.record.updatedAt,
  };
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

/** Every live file of one conversation. */
export async function listAppFiles(
  store: ChatStore,
  conversationId: string,
  signal?: AbortSignal
): Promise<AppFile[]> {
  const items = await listAll(store, "app_file", conversationId, signal);
  return items.map(toAppFile).filter((file): file is AppFile => file !== null);
}

/** Every live file of every conversation, read from the changes feed. */
export async function listEveryAppFile(store: ChatStore, signal?: AbortSignal): Promise<AppFile[]> {
  const latest = new Map<string, ChatSnapshot>();
  let cursor: string | undefined;
  do {
    const page = await store.changes(cursor, { kinds: ["app_file"], limit: 200, signal });
    for (const item of page.items) latest.set(item.record.id, item);
    cursor = page.nextCursor;
  } while (cursor);
  return [...latest.values()].map(toAppFile).filter((file): file is AppFile => file !== null);
}

/** One conversation file, or null when vault holds none at that path. */
export async function getAppFile(
  store: ChatStore,
  conversationId: string,
  path: string,
  signal?: AbortSignal
): Promise<AppFile | null> {
  const snapshot = await store.get("app_file", await appFileId(conversationId, path), signal);
  return snapshot && !snapshot.record.isDeleted ? toAppFile(snapshot) : null;
}

/** Creates or replaces a conversation file; the last save of a path wins across devices. */
export async function saveAppFile(
  store: ChatStore,
  file: { conversationId: string; path: string; content: string },
  signal?: AbortSignal
): Promise<AppFile> {
  const saved = await putLatest(
    store,
    {
      kind: "app_file",
      id: await appFileId(file.conversationId, file.path),
      conversationId: file.conversationId,
    },
    { data: { path: normalizePath(file.path), content: file.content }, isDeleted: false },
    signal
  );
  return toAppFile(saved as ChatSnapshot) as AppFile;
}

export async function deleteAppFile(
  store: ChatStore,
  conversationId: string,
  path: string,
  signal?: AbortSignal
): Promise<void> {
  await putLatest(
    store,
    { kind: "app_file", id: await appFileId(conversationId, path), conversationId },
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
  const saved = await putLatest(
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
