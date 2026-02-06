"use client";

import { useMemo } from "react";
import type { Database } from "@nozbe/watermelondb";
import type { DatabaseManager } from "../lib/db/manager";

/**
 * React hook that returns the correct WatermelonDB Database instance
 * for the current wallet address.
 *
 * Replaces the common pattern of:
 * ```typescript
 * const database = useMemo(() => getWatermelonDatabase(walletAddress), [walletAddress]);
 * ```
 *
 * When the wallet address changes, a new database instance is returned,
 * providing complete per-wallet data isolation.
 *
 * @param walletAddress - The current user's wallet address, or undefined for guest mode
 * @param manager - A DatabaseManager instance (should be created once at app level)
 * @returns The WatermelonDB Database instance for the current wallet
 *
 * @example
 * ```tsx
 * import { useDatabaseManager, DatabaseManager, webPlatformStorage } from '@reverbia/sdk/react';
 * import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
 *
 * // Create once at app level
 * const dbManager = new DatabaseManager({
 *   dbNamePrefix: 'my-app',
 *   createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
 *     schema, migrations, dbName,
 *     useWebWorker: false,
 *     useIncrementalIndexedDB: true,
 *   }),
 *   storage: webPlatformStorage,
 *   onDestructiveMigration: () => window.location.reload(),
 * });
 *
 * function MyComponent() {
 *   const { user } = usePrivy();
 *   const database = useDatabaseManager(user?.wallet?.address, dbManager);
 *
 *   // Pass database to SDK hooks
 *   const { sendMessage } = useChatStorage({ database, ... });
 * }
 * ```
 */
export function useDatabaseManager(
  walletAddress: string | undefined,
  manager: DatabaseManager
): Database {
  return useMemo(
    () => manager.getDatabase(walletAddress),
    [walletAddress, manager]
  );
}
