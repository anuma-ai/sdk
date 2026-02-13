/**
 * IndexedDB storage for non-extractable CryptoKey objects.
 *
 * Stores opaque CryptoKey handles in IndexedDB so they survive page refreshes
 * without ever exposing raw key bytes to JavaScript. An XSS attacker can use
 * the CryptoKey handle on the current page but cannot export or exfiltrate it.
 *
 * Lifecycle management:
 * - Each tab writes a heartbeat every 30 seconds.
 * - On init, stale entries (no heartbeat for > threshold) are purged.
 * - BroadcastChannel notifies sibling tabs when a key is derived.
 */

const DB_NAME = "reverbia-encryption-keys";
const STORE_NAME = "keys";
const DB_VERSION = 1;

const TAB_ID_KEY = "reverbia_tab_id";

export interface StoredKeyEntry {
  address: string;
  key: CryptoKey;
  createdAt: number;
  lastHeartbeat: number;
  tabId: string;
}

/** Generate a random UUID using a fallback if crypto.randomUUID is unavailable. */
function generateUUID(): string {
  // Use globalThis.crypto to get the real Crypto object with proper 'this' binding
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : crypto;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // randomUUID may fail if 'this' is not a Crypto instance
    }
  }
  // Fallback: simple timestamp + random suffix (unique enough for tab IDs)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Get or create a unique tab identifier (stored in sessionStorage – contains no sensitive data). */
export function getTabId(): string {
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (React Native, private browsing, etc.)
    return generateUUID();
  }
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "address" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store a CryptoKey with metadata. */
export async function storeKey(
  address: string,
  cryptoKey: CryptoKey,
  tabId: string
): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    const entry: StoredKeyEntry = {
      address,
      key: cryptoKey,
      createdAt: now,
      lastHeartbeat: now,
      tabId,
    };
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Load a CryptoKey by wallet address. Returns null if not found. */
export async function loadKey(address: string): Promise<CryptoKey | null> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(address);
    req.onsuccess = () => {
      const entry = req.result as StoredKeyEntry | undefined;
      resolve(entry?.key ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Load all stored entries (used during init to populate in-memory caches). */
export async function loadAllEntries(): Promise<StoredKeyEntry[]> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as StoredKeyEntry[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Remove a single key entry by address. */
export async function removeKey(address: string): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(address);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Clear all key entries. */
export async function removeAllKeys(): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Remove entries whose heartbeat is older than `maxAgeMs`. */
export async function cleanStaleKeys(maxAgeMs: number): Promise<string[]> {
  const entries = await loadAllEntries();
  const now = Date.now();
  const stale = entries.filter((e) => now - e.lastHeartbeat > maxAgeMs);
  if (stale.length === 0) return [];

  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const removed: string[] = [];
    for (const entry of stale) {
      store.delete(entry.address);
      removed.push(entry.address);
    }
    tx.oncomplete = () => {
      db.close();
      resolve(removed);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Refresh the heartbeat timestamp for entries owned by this tab. */
export async function updateHeartbeat(
  address: string,
  tabId: string
): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(address);
    getReq.onsuccess = () => {
      const entry = getReq.result as StoredKeyEntry | undefined;
      if (entry && entry.tabId === tabId) {
        entry.lastHeartbeat = Date.now();
        store.put(entry);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}
