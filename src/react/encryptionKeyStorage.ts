/**
 * IndexedDB storage for non-extractable CryptoKey objects.
 *
 * Stores opaque CryptoKey handles in IndexedDB so they survive page refreshes
 * without ever exposing raw key bytes to JavaScript. An XSS attacker can use
 * the CryptoKey handle on the current page but cannot export or exfiltrate it.
 *
 * Keys persist until explicitly cleared via removeKey/removeAllKeys (e.g., on logout).
 * BroadcastChannel notifies sibling tabs when a key is derived.
 */

const DB_NAME = "reverbia-encryption-keys";
const STORE_NAME = "keys";
const DB_VERSION = 1;

export interface StoredKeyEntry {
  address: string;
  key: CryptoKey;
  createdAt: number;
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
  cryptoKey: CryptoKey
): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: StoredKeyEntry = {
      address,
      key: cryptoKey,
      createdAt: Date.now(),
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
