import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { runChatBackendContract } from "./chatBackendContract";
import { localChatBackend } from "./WatermelonChatStorageAdapter";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chat-backend-contract-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

runChatBackendContract("WatermelonChatStorageAdapter", async () =>
  localChatBackend(makeDatabase())({})
);
