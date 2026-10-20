// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { UserPreference } from "./models";
import {
  getUserPreferenceOp,
  setUserPreferenceOp,
  type UserPreferencesStorageOperationsContext,
} from "./operations";

const WALLET = "0xwallet";
const FIRST = '[{"chainType":"solana","address":"FAKE","addedAt":1}]';
const SECOND = '[{"chainType":"solana","address":"FAKE2","addedAt":2}]';

function makeContext(): UserPreferencesStorageOperationsContext {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `user-preferences-test-${Math.random().toString(36).slice(2)}`,
  });
  const database = new Database({ adapter, modelClasses: sdkModelClasses });
  return { database, userPreferencesCollection: database.get<UserPreference>("userPreferences") };
}

describe("userPreferences externalWallets", () => {
  let ctx: UserPreferencesStorageOperationsContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it("stores the list on create and reads it back", async () => {
    await setUserPreferenceOp(ctx, WALLET, { externalWallets: FIRST });

    expect((await getUserPreferenceOp(ctx, WALLET))?.externalWallets).toBe(FIRST);
  });

  it("replaces the list on update", async () => {
    await setUserPreferenceOp(ctx, WALLET, { nickname: "kp" });
    await setUserPreferenceOp(ctx, WALLET, { externalWallets: SECOND });

    expect((await getUserPreferenceOp(ctx, WALLET))?.externalWallets).toBe(SECOND);
  });

  it("clears the list when updated with an empty string", async () => {
    await setUserPreferenceOp(ctx, WALLET, { externalWallets: FIRST });
    await setUserPreferenceOp(ctx, WALLET, { externalWallets: "" });

    expect((await getUserPreferenceOp(ctx, WALLET))?.externalWallets).toBeNull();
  });

  it("keeps the list when an update leaves it out", async () => {
    await setUserPreferenceOp(ctx, WALLET, { externalWallets: FIRST });
    await setUserPreferenceOp(ctx, WALLET, { nickname: "kp" });

    const stored = await getUserPreferenceOp(ctx, WALLET);
    expect(stored?.externalWallets).toBe(FIRST);
    expect(stored?.nickname).toBe("kp");
  });

  it("reads back null for a row created without it", async () => {
    await setUserPreferenceOp(ctx, WALLET, { nickname: "kp" });

    expect((await getUserPreferenceOp(ctx, WALLET))?.externalWallets).toBeNull();
  });
});
