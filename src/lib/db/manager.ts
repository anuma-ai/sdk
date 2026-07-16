import { Database } from "@nozbe/watermelondb";
import type { DatabaseAdapter } from "@nozbe/watermelondb/adapters/type";

import { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "./schema";

/**
 * Version threshold for destructive migrations.
 * Databases at a schema version below this require full deletion and recreation.
 * Version 8 introduced an incompatible embedding model change.
 */
const DESTRUCTIVE_MIGRATION_VERSION = 8;

/**
 * Platform abstraction for persistent and session storage.
 *
 * Web implementations use localStorage/sessionStorage/indexedDB.
 * Mobile implementations can use AsyncStorage/in-memory maps/SQLite cleanup.
 */
export interface PlatformStorage {
  /** Read a value from persistent storage (e.g. localStorage) */
  getItem(key: string): string | null;
  /** Write a value to persistent storage */
  setItem(key: string, value: string): void;
  /** Remove a value from persistent storage */
  removeItem(key: string): void;
  /** Read a value from session-scoped storage (e.g. sessionStorage). Used to prevent reload loops. */
  getSessionItem(key: string): string | null;
  /** Write a value to session-scoped storage */
  setSessionItem(key: string, value: string): void;
  /** Delete an IndexedDB database by name */
  deleteDatabase(name: string): Promise<void>;
}

/**
 * Optional logger interface for DatabaseManager.
 */
export interface DatabaseManagerLogger {
  debug?: (msg: string, ctx?: Record<string, unknown>) => void;
  warn?: (msg: string, ctx?: Record<string, unknown>) => void;
  info?: (msg: string, ctx?: Record<string, unknown>) => void;
}

/**
 * Configuration options for DatabaseManager.
 */
export interface DatabaseManagerOptions {
  /** Prefix for database names, e.g. "anuma-watermelon". Each wallet gets `{prefix}-{address}`. */
  dbNamePrefix: string;
  /**
   * Factory that creates a WatermelonDB adapter for a given database name.
   * The schema and migrations are provided for convenience.
   *
   * @example
   * ```typescript
   * createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
   *   schema,
   *   migrations,
   *   dbName,
   *   useWebWorker: false,
   *   useIncrementalIndexedDB: true,
   * })
   * ```
   */
  createAdapter: (
    dbName: string,
    schema: typeof sdkSchema,
    migrations: typeof sdkMigrations
  ) => DatabaseAdapter;
  /** Platform storage implementation. Defaults to webPlatformStorage. */
  storage?: PlatformStorage;
  /**
   * Called when a destructive migration is needed (schema too old).
   * On web, this typically triggers `window.location.reload()`.
   * If not provided, the manager will throw an error instead.
   */
  onDestructiveMigration?: () => void;
  /** Optional logger for debug/warn/info messages */
  logger?: DatabaseManagerLogger;
}

/**
 * Default PlatformStorage implementation for web browsers.
 * Uses localStorage for persistent storage, sessionStorage for session-scoped storage,
 * and indexedDB.deleteDatabase for database deletion.
 */
export const webPlatformStorage: PlatformStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  getSessionItem: (key: string) => sessionStorage.getItem(key),
  setSessionItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  deleteDatabase: (name: string) =>
    new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error(`Failed to delete database: ${name}`));
      request.onblocked = () => {
        // Resolve after timeout to prevent indefinite blocking
        setTimeout(resolve, 1000);
      };
    }),
};

// Per-wallet key helpers

function getDbName(prefix: string, walletAddress?: string): string {
  return walletAddress ? `${prefix}-${walletAddress}` : `${prefix}-guest`;
}

function getSchemaVersionKey(prefix: string, walletAddress?: string): string {
  return walletAddress
    ? `${prefix}-schema-version-${walletAddress}`
    : `${prefix}-schema-version-guest`;
}

function getMigrationReloadKey(prefix: string, walletAddress?: string): string {
  return walletAddress
    ? `${prefix}-migration-reload-${walletAddress}`
    : `${prefix}-migration-reload-guest`;
}

/**
 * Manages per-wallet WatermelonDB database instances.
 *
 * Each wallet address gets its own isolated database. The manager handles:
 * - Singleton caching per wallet
 * - Automatic database switching when the wallet changes
 * - Destructive schema migration detection and handling
 * - Per-wallet storage key namespacing
 *
 * @example
 * ```typescript
 * import { DatabaseManager, webPlatformStorage, sdkSchema, sdkMigrations } from '@anuma/sdk/react';
 * import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
 *
 * const dbManager = new DatabaseManager({
 *   dbNamePrefix: 'my-app',
 *   createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
 *     schema,
 *     migrations,
 *     dbName,
 *     useWebWorker: false,
 *     useIncrementalIndexedDB: true,
 *   }),
 *   storage: webPlatformStorage,
 *   onDestructiveMigration: () => window.location.reload(),
 * });
 *
 * // Get the database for the current wallet
 * const database = dbManager.getDatabase(walletAddress);
 * ```
 */
export class DatabaseManager {
  /**
   * WatermelonDB instances cached by their derived `dbName` (not by raw wallet
   * address). Caching per dbName makes {@link getDatabase} idempotent: a wallet
   * that is requested again — including after a transient `undefined`/guest
   * excursion or an address that briefly arrives in a different form during
   * sign-up — reuses the SAME instance instead of being torn down and rebuilt.
   * The rebuild was what left the web OPFS adapter disposed/orphaned mid-session
   * (client#4821). Instances are kept for the lifetime of the manager (typically
   * guest + one wallet); switching wallets keeps prior ones cached rather than
   * disposing an instance the app may still hold a reference to.
   */
  private readonly databases = new Map<string, Database>();
  private migrationInProgress = false;

  private readonly dbNamePrefix: string;
  private readonly createAdapter: DatabaseManagerOptions["createAdapter"];
  private readonly storage: PlatformStorage;
  private readonly onDestructiveMigration?: () => void;
  private readonly logger: DatabaseManagerLogger;

  constructor(options: DatabaseManagerOptions) {
    this.dbNamePrefix = options.dbNamePrefix;
    this.createAdapter = options.createAdapter;
    this.storage = options.storage ?? webPlatformStorage;
    this.onDestructiveMigration = options.onDestructiveMigration;
    this.logger = options.logger ?? {};
  }

  /**
   * Get the database name for a given wallet address.
   */
  getDbName(walletAddress?: string): string {
    return getDbName(this.dbNamePrefix, walletAddress);
  }

  /**
   * Get or create a WatermelonDB Database instance for the given wallet.
   *
   * Instances are cached per derived dbName and reused across calls (including
   * repeat/guest-interleaved requests for the same wallet); a new one is built
   * only for a dbName not yet seen. See the `databases` field for why.
   *
   * @param walletAddress - The wallet address to scope the database to.
   *   If undefined, uses a "guest" database.
   * @returns The WatermelonDB Database instance
   * @throws If a destructive migration is in progress
   */
  getDatabase(walletAddress?: string): Database {
    const dbName = this.getDbName(walletAddress);

    // Idempotent per dbName: an already-built instance is reused as-is. This is
    // the key that stops the sign-up-time teardown/rebuild churn — a wallet whose
    // request briefly interleaves with a guest (`undefined`) render resolves to
    // the same dbName and hits this cache instead of recreating the adapter
    // (client#4821).
    //
    // The cache key is the raw dbName, so callers must pass a wallet address in a
    // consistent CASE (the same address checksummed vs lowercase would key two
    // entries → a split store). Callers do: the app resolves every address through
    // one source (getEmbeddedWalletAddress → Privy's checksummed address), and
    // prod telemetry shows addresses uniformly checksummed. We intentionally do
    // NOT lowercase here: existing on-device stores were created under the
    // checksummed dbName, so normalizing would strand them (see client#4821).
    const cached = this.databases.get(dbName);
    if (cached) {
      return cached;
    }

    // Check for destructive migration (runs once per dbName, before first build)
    const needsMigration = this.handleSchemaMigration(walletAddress);
    if (needsMigration) {
      throw new Error("Database migration in progress - app will restart");
    }

    this.logger.debug?.("Initializing database", {
      component: "DatabaseManager",
      dbName,
      walletAddress,
    });

    const adapter = this.createAdapter(dbName, sdkSchema, sdkMigrations);

    const database = new Database({
      adapter,
      modelClasses: sdkModelClasses,
    });
    this.databases.set(dbName, database);

    return database;
  }

  /**
   * Reset ALL cached databases (useful for logout or testing).
   */
  async resetDatabase(): Promise<void> {
    // Reset EVERY cached instance, not just a "current" one — a transient guest
    // render leaves the last-seen wallet ambiguous, and logout/testing wants all
    // local stores cleared. Delete each entry only AFTER its own reset resolves so:
    //  - a concurrent getDatabase for the same dbName hits the still-cached
    //    instance instead of building a duplicate adapter mid-reset (the OPFS
    //    orphan this change guards against, client#4821);
    //  - a rejected reset can't leave an already-wiped instance cached — only
    //    successfully-reset entries are removed.
    for (const [dbName, db] of [...this.databases.entries()]) {
      await db.write(async () => {
        await db.unsafeResetDatabase();
      });
      this.databases.delete(dbName);
    }
  }

  /**
   * Check and handle schema migrations for a specific wallet.
   * Returns true if a destructive migration is in progress.
   */
  private handleSchemaMigration(walletAddress?: string): boolean {
    const schemaVersionKey = getSchemaVersionKey(this.dbNamePrefix, walletAddress);
    const migrationReloadKey = getMigrationReloadKey(this.dbNamePrefix, walletAddress);
    const dbName = this.getDbName(walletAddress);

    const storedVersion = this.storage.getItem(schemaVersionKey);
    const storedVersionNum = storedVersion ? parseInt(storedVersion, 10) : null;
    const alreadyReloaded = this.storage.getSessionItem(migrationReloadKey);

    if (storedVersionNum !== null && storedVersionNum < DESTRUCTIVE_MIGRATION_VERSION) {
      this.logger.debug?.("Clearing database for schema migration", {
        component: "DatabaseManager",
        walletAddress,
        storedVersion: storedVersionNum,
        targetVersion: SDK_SCHEMA_VERSION,
      });

      // Only trigger migration once per session to prevent infinite loops
      if (!alreadyReloaded) {
        this.storage.setSessionItem(migrationReloadKey, "true");
        this.migrationInProgress = true;

        // Delete databases and trigger app restart
        Promise.all([
          this.storage.deleteDatabase(dbName),
          this.storage.deleteDatabase(`${dbName}_loki`),
        ])
          .then(() => {
            this.storage.setItem(schemaVersionKey, String(SDK_SCHEMA_VERSION));
            this.onDestructiveMigration?.();
          })
          .catch((error) => {
            this.logger.warn?.("Failed to delete databases during migration", {
              component: "DatabaseManager",
              error,
            });
            // Still update version to prevent infinite loops
            this.storage.setItem(schemaVersionKey, String(SDK_SCHEMA_VERSION));
            this.onDestructiveMigration?.();
          });

        return true;
      } else {
        this.logger.warn?.(
          "Migration reload already attempted this session, skipping to prevent loop",
          { component: "DatabaseManager" }
        );
        // Update version to prevent future attempts
        this.storage.setItem(schemaVersionKey, String(SDK_SCHEMA_VERSION));
      }
    } else if (storedVersion === null) {
      // First time for this wallet — set initial version
      this.storage.setItem(schemaVersionKey, String(SDK_SCHEMA_VERSION));
    }

    return false;
  }
}
