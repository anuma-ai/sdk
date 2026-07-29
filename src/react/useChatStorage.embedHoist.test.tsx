// @vitest-environment happy-dom
/**
 * Concurrency + error-ordering guard for the hoisted tool-selection work on the
 * React send path.
 *
 * `sendMessage` used to await the user-message embedding and then the server-tool
 * catalog AFTER the storage chain (history read, summarization, user-message
 * write) had finished, so two network round-trips sat on the critical path back
 * to back. They now start right after the per-call redactor is resolved and are
 * awaited at their original positions.
 *
 * The first test is the one that matters: it asserts BOTH calls were already
 * issued while the user-message write is still in flight and neither has
 * settled. A correctness-only test passes against the old serial code; this one
 * cannot — serially, nothing is called until the write resolves.
 *
 * The rest pin the error semantics the hoist could quietly change: a failed
 * embedding must still be distinguishable from a short prompt, a caller filter
 * that throws must still be swallowed, a catalog outage must not cost the turn
 * its client-tool narrowing, and a send that bails out before the awaits must
 * not leave the in-flight promises rejecting with no handler (an unhandled
 * rejection is a crash on React Native).
 *
 * Which tests hold on the OLD serial code matters, because that is what says
 * "behaviour unchanged" rather than "the new code is self-consistent". Run
 * against the pre-hoist file, five of these seven pass; the two that fail are
 * the two timing assertions — the concurrency test by construction, and the
 * bail-out test's in-flight check. Nothing about tool selection or error
 * handling changes, which is the point.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
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
    dbName: `embed-hoist-react-${Math.random().toString(36).slice(2)}`,
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

describe("useChatStorage hoisted tool-selection work (react)", () => {
  let db: Database;
  let realCreateMessageOp: typeof createMessageOp;
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
        conversationId: "conv_react_hoist",
        getToken: async () => "tok",
      })
    );

    const send = result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      // A function filter is what the old code awaited the embedding for.
      serverTools: (_embeddings, tools) => tools.map((t) => t.name),
    });

    // The user-message write has started and is parked, and neither network call
    // has settled. Both must already be in flight: serially, neither would have
    // been made yet.
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

  it("hands the filter the embedding and still selects the right tools", async () => {
    catalogImpl = async () => [serverTool("server_a"), serverTool("server_b")];

    const seenEmbedding = vi.fn();
    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_filter",
        getToken: async () => "tok",
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (embeddings, tools) => {
        seenEmbedding(embeddings);
        return [tools[0].name];
      },
      clientToolsFilter: () => ["client_a"],
    });

    expect(res.error).toBeNull();
    expect(seenEmbedding).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: ["server_a"], clientToolNames: ["client_a"] })
    );
  });

  it("keeps the full client toolkit when the embedding fails mid-write", async () => {
    const storageGate = deferred<void>();
    const writeStarted = deferred<void>();
    mockCreateMessageOp.mockImplementation(async (...args) => {
      writeStarted.resolve();
      await storageGate.promise;
      return realCreateMessageOp(...args);
    });

    const embedding = deferred<number[]>();
    embedImpl = () => embedding.promise;
    catalogImpl = async () => [serverTool("server_a")];

    const clientToolsFilter = vi.fn(() => ["client_a"]);
    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_embed_fail",
        getToken: async () => "tok",
        onToolSelection: selection,
      })
    );

    const send = result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      clientToolsFilter,
    });

    // Fail the embedding while the write is still parked — i.e. earlier than the
    // serial code could ever have failed it.
    await writeStarted.promise;
    embedding.reject(new Error("embeddings down"));
    await flush();
    storageGate.resolve();

    const res = await send;
    expect(res.error).toBeNull();
    // A genuine embeddings outage skips the explicit filter entirely rather than
    // handing it null — the turn keeps every client tool.
    expect(clientToolsFilter).not.toHaveBeenCalled();
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ clientToolNames: ["client_a", "client_b"] })
    );
    // No unhandled-rejection assertion here on purpose. This send awaits the
    // embedding a few lines later, so containment is not what is being tested —
    // and against the serial code the fixture rejects a promise nobody ever
    // asked for, which reports as unhandled for reasons that have nothing to do
    // with the send. The containment guard lives in the bail-out test below,
    // where the send genuinely returns without awaiting either promise.
  });

  it("swallows a serverTools filter that throws and ships no server tools", async () => {
    catalogImpl = async () => [serverTool("server_a"), serverTool("server_b")];

    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_filter_throws",
        getToken: async () => "tok",
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: () => {
        throw new Error("filter blew up");
      },
      clientToolsFilter: () => ["client_a"],
    });

    // The catalog fetch's own catch moved into the hoisted promise, but the try
    // around the FILTERING has to stay: a caller-supplied filter throwing has
    // always been swallowed here, and it must not surface as a failed send.
    expect(res.error).toBeNull();
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: [], clientToolNames: ["client_a"] })
    );
  });

  it("still narrows the client tools when the catalog fetch fails", async () => {
    catalogImpl = async () => {
      throw new Error("catalog down");
    };

    const clientToolsFilter = vi.fn(() => ["client_b"]);
    const selection = vi.fn();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_catalog_fail",
        getToken: async () => "tok",
        onToolSelection: selection,
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (_embeddings, tools) => tools.map((t) => t.name),
      clientToolsFilter,
    });

    // Server tools are optional: a catalog outage costs the turn its server
    // tools and nothing else. The embedding is a separate request, so it still
    // resolves once and still narrows the client toolkit.
    expect(res.error).toBeNull();
    expect(embedCalls).toHaveLength(1);
    expect(clientToolsFilter).toHaveBeenCalledWith([0.1, 0.2, 0.3], CLIENT_TOOLS);
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ serverToolNames: [], clientToolNames: ["client_b"] })
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
      throw new Error("disk is on fire");
    });

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_bail",
        getToken: async () => "tok",
      })
    );

    const res = await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      serverTools: (_embeddings, tools) => tools.map((t) => t.name),
    });
    expect(res.error).toBe("disk is on fire");
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

  it("skips both calls when there is nothing to select", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_react_noop",
        // No getToken — neither the embedding nor the catalog can be fetched.
      })
    );

    await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
    });

    expect(embedCalls).toHaveLength(0);
    expect(catalogCalls).toHaveLength(0);
  });
});
