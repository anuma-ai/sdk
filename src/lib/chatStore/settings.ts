import { type ChatJson, type ChatSnapshot, type ChatStore, ChatStoreError } from "./types.js";

export interface Setting {
  section: string;
  data: { [key: string]: ChatJson };
  version: number;
  createdAt: number;
  updatedAt: number;
}

const maxSaveAttempts = 3;

function toSetting(snapshot: ChatSnapshot): Setting | null {
  if (snapshot.record.isDeleted) return null;
  return {
    section: snapshot.record.id,
    data: snapshot.record.data,
    version: snapshot.version,
    createdAt: snapshot.record.createdAt,
    updatedAt: snapshot.record.updatedAt,
  };
}

/** Every stored settings section, keyed by section name. */
export async function loadSettings(
  store: ChatStore,
  signal?: AbortSignal
): Promise<Map<string, Setting>> {
  const out = new Map<string, Setting>();
  let cursor: string | undefined;
  do {
    const page = await store.list({ kind: "setting", limit: 100, cursor, signal });
    for (const item of page.items) {
      const setting = toSetting(item);
      if (setting) out.set(setting.section, setting);
    }
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

/** Replaces one section with `data`; the last save of a section wins across devices. */
export async function saveSetting(
  store: ChatStore,
  section: string,
  data: { [key: string]: ChatJson },
  signal?: AbortSignal
): Promise<Setting> {
  for (let attempt = 1; ; attempt++) {
    const current = await store.get("setting", section, signal);
    const now = Date.now();
    try {
      const [saved] = await store.putMany(
        [
          {
            record: {
              kind: "setting",
              id: section,
              conversationId: "",
              sortKey: 0,
              createdAt: current?.record.createdAt ?? now,
              updatedAt: Math.max(now, (current?.record.updatedAt ?? 0) + 1),
              isDeleted: false,
              data,
            },
            expectedVersion: current?.version ?? 0,
          },
        ],
        signal
      );
      return toSetting(saved) as Setting;
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
