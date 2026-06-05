import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import {
  getModelPreferenceOp,
  ModelPreference,
  type SettingsStorageOperationsContext,
  type StoredModelPreference,
} from "../lib/db/settings";
import {
  getUserPreferenceOp,
  migrateFromModelPreferencesOp,
  type StoredUserPreference,
  UserPreference,
  type UserPreferencesStorageOperationsContext,
} from "../lib/db/userPreferences";

/**
 * Module-level subscription pool for `useSettings`.
 *
 * Without this, every call to `useSettings({ database, walletAddress })`
 * spins up its own `.fetch()` and its own `.observe()` subscription on the
 * `userPreferences` row. With many consumers (a typical app has 8-10) the
 * worker bridge ships the same raw row repeatedly — WatermelonDB logs
 * "Record userPreferences#X is cached, but full raw object was sent over
 * the bridge" on every duplicate fetch.
 *
 * The pool guarantees one fetch + one observe per `(database, walletAddress)`
 * key regardless of how many hook instances mount. State is exposed as a
 * stable snapshot consumed via `useSyncExternalStore`.
 */

interface SettingsSnapshot {
  modelPreference: StoredModelPreference | null;
  userPreference: StoredUserPreference | null;
  isLoading: boolean;
}

export const EMPTY_SNAPSHOT: SettingsSnapshot = {
  modelPreference: null,
  userPreference: null,
  isLoading: false,
};

interface PoolEntry {
  snapshot: SettingsSnapshot;
  listeners: Set<() => void>;
  refCount: number;
  observeSub: { unsubscribe: () => void } | null;
  loadCancelled: boolean;
  storageCtx: UserPreferencesStorageOperationsContext;
  legacyStorageCtx: SettingsStorageOperationsContext;
}

const pool = new WeakMap<Database, Map<string, PoolEntry>>();

function getOrCreatePerDb(database: Database): Map<string, PoolEntry> {
  let perDb = pool.get(database);
  if (!perDb) {
    perDb = new Map();
    pool.set(database, perDb);
  }
  return perDb;
}

function createEntry(database: Database): PoolEntry {
  const userPreferencesCollection = database.get<UserPreference>("userPreferences");
  const modelPreferencesCollection = database.get<ModelPreference>("modelPreferences");
  return {
    snapshot: EMPTY_SNAPSHOT,
    listeners: new Set(),
    refCount: 0,
    observeSub: null,
    loadCancelled: false,
    storageCtx: { database, userPreferencesCollection, modelPreferencesCollection },
    legacyStorageCtx: { database, modelPreferencesCollection },
  };
}

function patchSnapshot(entry: PoolEntry, patch: Partial<SettingsSnapshot>): void {
  entry.snapshot = { ...entry.snapshot, ...patch };
  for (const listener of entry.listeners) listener();
}

async function startLoad(entry: PoolEntry, walletAddress: string): Promise<void> {
  patchSnapshot(entry, { isLoading: true });
  try {
    let preference = await getUserPreferenceOp(entry.storageCtx, walletAddress);
    if (!preference) {
      preference = await migrateFromModelPreferencesOp(entry.storageCtx, walletAddress);
    }
    if (entry.loadCancelled) return;
    patchSnapshot(entry, { userPreference: preference });

    const legacyPreference = await getModelPreferenceOp(entry.legacyStorageCtx, walletAddress);
    if (entry.loadCancelled) return;
    patchSnapshot(entry, { modelPreference: legacyPreference });
  } finally {
    if (!entry.loadCancelled) patchSnapshot(entry, { isLoading: false });
  }
}

function startObserve(entry: PoolEntry, walletAddress: string): void {
  entry.observeSub = entry.storageCtx.userPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .observeWithColumns([
      "nickname",
      "occupation",
      "description",
      "models",
      "personality",
      "updated_at",
    ])
    .subscribe((records) => {
      const record = records[0];
      if (!record) return;
      patchSnapshot(entry, {
        userPreference: {
          uniqueId: record.id,
          walletAddress: record.walletAddress,
          nickname: record.nickname,
          occupation: record.occupation,
          description: record.description,
          models: record.models,
          personality: record.personality,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    });
}

/**
 * Subscribe to the shared settings store for a given database/wallet pair.
 *
 * The first subscriber for a key triggers the underlying load and observe;
 * subsequent subscribers reuse them. The cleanup function decrements the
 * refcount and tears down the subscription when the last subscriber leaves.
 *
 * `walletAddress === undefined` returns an empty unsubscribe — no-op.
 */
export function subscribeUserSettings(
  database: Database,
  walletAddress: string | undefined,
  listener: () => void
): () => void {
  if (!walletAddress) return () => undefined;
  const perDb = getOrCreatePerDb(database);
  let entry = perDb.get(walletAddress);
  if (!entry) {
    entry = createEntry(database);
    perDb.set(walletAddress, entry);
  }
  entry.listeners.add(listener);
  entry.refCount++;

  if (entry.refCount === 1) {
    entry.loadCancelled = false;
    void startLoad(entry, walletAddress);
    startObserve(entry, walletAddress);
  }

  return () => {
    entry.listeners.delete(listener);
    entry.refCount--;
    if (entry.refCount === 0) {
      entry.loadCancelled = true;
      entry.observeSub?.unsubscribe();
      entry.observeSub = null;
      perDb.delete(walletAddress);
    }
  };
}

export function getUserSettingsSnapshot(
  database: Database,
  walletAddress: string | undefined
): SettingsSnapshot {
  if (!walletAddress) return EMPTY_SNAPSHOT;
  return pool.get(database)?.get(walletAddress)?.snapshot ?? EMPTY_SNAPSHOT;
}

/**
 * Patch the cached snapshot for a key. Used by mutation operations
 * (`setUserPreference`, `updateProfile`, etc.) to immediately surface their
 * result without waiting for the WatermelonDB observe callback to fire —
 * preserves the inline-state-update behavior of the original hook.
 */
export function patchUserSettingsSnapshot(
  database: Database,
  walletAddress: string | undefined,
  patch: Partial<SettingsSnapshot>
): void {
  if (!walletAddress) return;
  const entry = pool.get(database)?.get(walletAddress);
  if (!entry) return;
  patchSnapshot(entry, patch);
}

/**
 * Test-only: report whether a pool entry exists for the given key. Used to
 * assert that the last unsubscriber tears the entry down. Production code
 * should not import this.
 */
export function __hasUserSettingsPoolEntryForTests(
  database: Database,
  walletAddress: string
): boolean {
  return pool.get(database)?.has(walletAddress) ?? false;
}
