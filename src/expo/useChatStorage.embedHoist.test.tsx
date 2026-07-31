// @vitest-environment happy-dom
/**
 * Concurrency + error-ordering guard for the hoisted tool-selection work on the
 * Expo send path.
 *
 * `sendMessage` used to fetch the server-tool catalog after the storage chain
 * (history read, summarization, user-message write) and only then embed the
 * prompt — three round-trips in series. The embedding and the catalog fetch now
 * start right after the per-call redactor is resolved.
 *
 * Expo is NOT a copy of the react path here, so this file guards its specific
 * shape: the embedding used to run INSIDE the server-tools try, which means an
 * embeddings failure logged "Failed to fetch server tools", discarded the
 * catalog it had just fetched, left the failure flag unset, and let the client
 * block retry the embedding. Every one of those is asserted below, because the
 * hoist turns one lazy call into one settled result and the retry only survives
 * if it is reproduced deliberately.
 *
 * Run against the pre-hoist file, three of these five pass — the retry, the
 * catalog-failure reuse and the defer-loading gate — which is the evidence that
 * behaviour is unchanged. The two that fail are the timing assertions: the
 * concurrency test by construction, and the bail-out test's in-flight check.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { consoleLogger, setLogger, type Logger } from "../lib/logger";
import type { ServerTool } from "../lib/tools";

// The two hoisted network calls are stubbed with PLAIN functions, not vi.fn:
// vitest's spies attach a handler to every promise a mock returns (settled-result
// tracking), which would mark a rejected promise as handled and make the
// unhandled-rejection guard at the bottom of this file vacuous. Calls are
// therefore recorded by hand.
const embedCalls: string[] = [];
let embedImpl: () => Promise<number[] | number[][]> = async () => [0.1, 0.2, 0.3];
const catalogCalls: unknown[] = [];
let catalogImpl: () => Promise<ServerTool[]> = async () => [];

// Clean loop result so the send completes and we can inspect what it selected.
vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

// Stubbed at memoryEngine/generate — the leaf both the hook's barrel import and
// the client tool selector reach — so nothing in the send touches the real
// endpoint. generateEmbeddings is stubbed for autoFilterClientTools, which
// cold-embeds the tool descriptions; the hoist itself uses generateEmbedding for
// the prompts in this file.
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: (text: string) => {
      embedCalls.push(text);
      return embedImpl();
    },
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});
vi.mock("../lib/tools", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/tools")>();
  return {
    ...orig,
    getServerTools: (options: unknown) => {
      catalogCalls.push(options);
      return catalogImpl();
    },
  };
});

// The storage write we gate on, so "still writing the user message" is a state
// the test can hold open.
vi.mock("../lib/db/chat", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/db/chat")>();
  return { ...orig, createMessageOp: vi.fn() };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { createMessageOp } from "../lib/db/chat";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockCreateMessageOp = vi.mocked(createMessageOp);

/**
 * A promise plus its settle handles, for holding an async step open.
 *
 * Deliberately does NOT attach an inert catch: these promises are handed to the
 * hook as-is, so an implementation that hoists a bare promise and only guards it
 * at the far-away await site shows up as an unhandled rejection.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let every already-queued microtask and macrotask run. */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `embed-hoist-expo-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function serverTool(name: string): ServerTool {
  return {
    type: "function",
    name,
    description: `${name} does something`,
    parameters: { type: "object", properties: {}, required: [] },
  };
}

const CLIENT_TOOLS = [
  { type: "function" as const, function: { name: "client_a", description: "a" } },
  { type: "function" as const, function: { name: "client_b", description: "b" } },
];

// Long enough to clear MIN_CONTENT_LENGTH_FOR_TOOLS (5), short enough to stay a
// single embedding rather than chunked.
const USER_TEXT = "book me a table for four tonight";

const USER_MESSAGE = [{ role: "user" as const, content: [{ type: "text", text: USER_TEXT }] }];

function responsesShape(text: string) {
  return {
    id: `resp-${Math.random().toString(36).slice(2)}`,
    model: "test-model",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        status: "completed",
      },
    ],
    usage: undefined,
  };
}

describe("useChatStorage hoisted tool-selection work (expo)", () => {
  let db: Database;
  let realCreateMessageOp: typeof createMessageOp;
  // Typed to `Logger["warn"]` so the mock is assignable to the logger we install
  // below; a bare `vi.fn()` widens to the any-args mock signature and is not.
  let warn: ReturnType<typeof vi.fn<Logger["warn"]>>;
  let unhandled: unknown[];
  // Node's process event, not the DOM one — happy-dom does not forward unhandled
  // rejections to `window`, so a DOM listener would never fire.
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    db = makeDatabase();
    embedCalls.length = 0;
    catalogCalls.length = 0;
    embedImpl = async () => [0.1, 0.2, 0.3];
    catalogImpl = async () => [];
    unhandled = [];
    process.on("unhandledRejection", onUnhandled);
    warn = vi.fn<Logger["warn"]>();
    setLogger({ debug: () => {}, info: () => {}, warn, error: () => {} });
    const actual = await vi.importActual<typeof import("../lib/db/chat")>("../lib/db/chat");
    realCreateMessageOp = actual.createMessageOp;
    mockCreateMessageOp.mockImplementation(realCreateMessageOp);
    mockRunToolLoop.mockResolvedValue({
      data: responsesShape("done"),
      error: null,
    } as never);
  });

  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
    setLogger(consoleLogger);
    vi.clearAllMocks();
  });

  it("issues the embedding and the server-tool fetch before the user-message write finishes", async () => {
    const storageGate = deferred<void>();
    const writeStarted = deferred<void>();
    mockCreateMessageOp.mockImplementation(async (...args) => {
      writeStarted.resolve();
      await storageGate.promise;
      return realCreateMessageOp(...args);
    });

    const embedding = deferred<number[]>();
    const catalog = deferred<ServerTool[]>();
    embedImpl = () => embedding.promise;
    catalogImpl = () => catalog.promise;

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_hoist",
        getToken: async () => "tok",
        autoEmbedMessages: false,
      })
    );

    const send = result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      // A function filter is what the old code embedded for — and it only
      // embedded after the catalog had already come back.
      serverTools: (_embedding, tools) => tools.map((t) => t.name),
    });

    // The user-message write has started and is parked, and neither network call
    // has settled. Both must already be in flight: serially, neither would have
    // been made yet, and the embedding would additionally have waited on the
    // catalog.
    await writeStarted.promise;
    await flush();
    expect(embedCalls).toHaveLength(1);
    expect(catalogCalls).toHaveLength(1);

    storageGate.resolve();
    embedding.resolve([0.1, 0.2, 0.3]);
    catalog.resolve([serverTool("server_a")]);

    const res = await send;
    expect(res.error).toBeNull();
  });

  it("retries the embedding in the client block when the server filter's attempt fails", async () => {
    // First attempt (the hoisted one, consumed by the server filter) fails; the
    // second is the retry the client block has always made.
    let attempt = 0;
    embedImpl = async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("embeddings blip");
      return [0.1, 0.2, 0.3];
    };
    catalogImpl = async () => [serverTool("server_a"), serverTool("server_b")];

    const clientToolsFilter = vi.fn(() => ["client_a"]);
    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_retry",
        getToken: async () => "tok",
        autoEmbedMessages: false,
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (_embedding, tools) => tools.map((t) => t.name),
      clientToolsFilter,
    });

    expect(res.error).toBeNull();
    // The failure lands in the server-tools catch exactly as before: same log
    // line, and the catalog that DID come back is discarded.
    expect(warn).toHaveBeenCalledWith(
      "[useChatStorage] Failed to fetch server tools:",
      expect.objectContaining({ message: "embeddings blip" })
    );
    // Two attempts — the retry is what lets the client filter still narrow.
    expect(embedCalls).toHaveLength(2);
    expect(clientToolsFilter).toHaveBeenCalledWith([0.1, 0.2, 0.3], CLIENT_TOOLS);
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: [], clientToolNames: ["client_a"] })
    );
    expect(unhandled).toEqual([]);
  });

  it("reuses the hoisted embedding when the catalog fetch is the thing that fails", async () => {
    catalogImpl = async () => {
      throw new Error("catalog down");
    };

    const clientToolsFilter = vi.fn(() => ["client_b"]);
    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_catalog_fail",
        getToken: async () => "tok",
        autoEmbedMessages: false,
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (_embedding, tools) => tools.map((t) => t.name),
      clientToolsFilter,
    });

    expect(res.error).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[useChatStorage] Failed to fetch server tools:",
      expect.objectContaining({ message: "catalog down" })
    );
    // The server filter never consumed the embedding, so the client block reuses
    // it rather than paying for a second one.
    expect(embedCalls).toHaveLength(1);
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: [], clientToolNames: ["client_b"] })
    );
  });

  it("does not embed when defer-loading is emitting the full catalog and there are no client tools", async () => {
    catalogImpl = async () => [serverTool("server_a")];

    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_defer",
        getToken: async () => "tok",
        autoEmbedMessages: false,
        serverTools: { deferLoading: { enabled: true, hotToolNames: [] } },
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      apiType: "responses",
      serverTools: (_embedding, tools) => tools.map((t) => t.name),
    });

    expect(res.error).toBeNull();
    // Defer-loading ships the whole catalog unfiltered, so nothing downstream
    // wants an embedding — starting one here would be a network call the serial
    // code never made, and storage would then embed the same text again.
    expect(embedCalls).toHaveLength(0);
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: ["server_a"] })
    );
  });

  it("does not leak an unhandled rejection when the send bails out before the awaits", async () => {
    const embedding = deferred<number[]>();
    const catalog = deferred<ServerTool[]>();
    embedImpl = () => embedding.promise;
    catalogImpl = () => catalog.promise;

    const writeStarted = deferred<void>();
    mockCreateMessageOp.mockImplementation(async () => {
      writeStarted.resolve();
      throw new Error("sqlite is unhappy");
    });

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_bail",
        getToken: async () => "tok",
        autoEmbedMessages: false,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (_embedding, tools) => tools.map((t) => t.name),
    });
    expect(res.error).toBe("sqlite is unhappy");
    // Both were in flight when the send gave up.
    expect(embedCalls).toHaveLength(1);
    expect(catalogCalls).toHaveLength(1);

    // The send returned without ever awaiting either promise. Failing them now
    // must stay contained: on React Native an unhandled rejection reaches the
    // app's crash handler.
    await writeStarted.promise;
    embedding.reject(new Error("embeddings down"));
    catalog.reject(new Error("catalog down"));
    await flush();
    expect(unhandled).toEqual([]);
  });
});
