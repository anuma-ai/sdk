// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ServerTool } from "../lib/tools";

const embedCalls: string[] = [];
let embedImpl: () => Promise<number[] | number[][]> = async () => [0.1, 0.2, 0.3];
const catalogCalls: unknown[] = [];
let catalogImpl: () => Promise<ServerTool[]> = async () => [];

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

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

vi.mock("../lib/db/chat", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/db/chat")>();
  return { ...orig, createMessageOp: vi.fn() };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { createMessageOp } from "../lib/db/chat";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockCreateMessageOp = vi.mocked(createMessageOp);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
      serverTools: (_embeddings, tools) => tools.map((t) => t.name),
    });

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

    await writeStarted.promise;
    embedding.reject(new Error("embeddings down"));
    await flush();
    storageGate.resolve();

    const res = await send;
    expect(res.error).toBeNull();
    expect(clientToolsFilter).not.toHaveBeenCalled();
    expect(selection).toHaveBeenCalledWith(
      expect.objectContaining({ clientToolNames: ["client_a", "client_b"] })
    );
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
    expect(embedCalls).toHaveLength(1);
    expect(catalogCalls).toHaveLength(1);

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
