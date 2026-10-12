// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createMessageOp,
  getMessageOp,
  getMessagesOp,
  makeSyntheticStoredMessage,
  type StorageOperationsContext,
} from "./operations";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const mockSignMessage = vi.fn(
  async (message: string) => `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`
) as unknown as SignMessageFn;

function ensureCrypto(): void {
  if (!global.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require("node:crypto");
    Object.defineProperty(global, "crypto", {
      value: webcrypto as Crypto,
      writable: true,
      configurable: true,
    });
  }
}

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `origin-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function makeEncryptedCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
    walletAddress: TEST_ADDRESS,
    signMessage: mockSignMessage,
  };
}

async function rawRows(ctx: StorageOperationsContext): Promise<Record<string, unknown>[]> {
  return (await ctx.messagesCollection.query().unsafeFetchRaw()) as Record<string, unknown>[];
}

describe("message origin (v44)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
    ensureCrypto();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("stores origin as plaintext while content is encrypted in the same write", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: '[Tool Execution Results]\n\nTool "gmail_search" returned: {}',
      model: "",
      origin: "tool_result",
      uniqueId: "m1",
    });

    const [row] = await rawRows(ctx);
    expect(String(row.content).startsWith("enc:")).toBe(true);
    expect(row.origin).toBe("tool_result");
  });

  it("round-trips origin through both read mappers", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "tool dump",
      origin: "tool_result",
      uniqueId: "m1",
    });

    expect((await getMessageOp(ctx, "m1"))?.origin).toBe("tool_result");
    const [fromThread] = await getMessagesOp(ctx, "conv-1");
    expect(fromThread.origin).toBe("tool_result");
  });

  it("reads back undefined for a row written without origin (legacy/pre-v44 shape)", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "a message the user actually typed",
      uniqueId: "m1",
    });

    const [row] = await rawRows(ctx);
    expect(row.origin).toBeNull();
    expect((await getMessageOp(ctx, "m1"))?.origin).toBeFalsy();
    const [fromThread] = await getMessagesOp(ctx, "conv-1");
    expect(fromThread.origin).not.toBe("tool_result");
  });

  it("carries origin on the synthetic (queued-write) message too", () => {
    const synthetic = makeSyntheticStoredMessage({
      conversationId: "conv-1",
      role: "user",
      content: "tool dump",
      origin: "tool_result",
    });
    expect(synthetic.origin).toBe("tool_result");
  });
});
