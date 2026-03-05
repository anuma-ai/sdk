import type { PlatformStorage } from "../lib/db/manager";

/**
 * Create a server-compatible PlatformStorage backed by in-memory Maps.
 *
 * Replaces browser localStorage/sessionStorage/indexedDB with simple
 * in-memory storage suitable for Node.js server processes.
 *
 * @example
 * ```typescript
 * const dbManager = new DatabaseManager({
 *   dbNamePrefix: "anuma-server",
 *   createAdapter: (dbName, schema, migrations) => ...,
 *   storage: serverPlatformStorage(),
 * });
 * ```
 */
export function serverPlatformStorage(): PlatformStorage {
  const persistent = new Map<string, string>();
  const session = new Map<string, string>();

  return {
    getItem: (key: string) => persistent.get(key) ?? null,
    setItem: (key: string, value: string) => {
      persistent.set(key, value);
    },
    removeItem: (key: string) => {
      persistent.delete(key);
    },
    getSessionItem: (key: string) => session.get(key) ?? null,
    setSessionItem: (key: string, value: string) => {
      session.set(key, value);
    },
    deleteDatabase: async () => {
      // No-op on server — LokiJS in-memory databases don't need cleanup
    },
  };
}
