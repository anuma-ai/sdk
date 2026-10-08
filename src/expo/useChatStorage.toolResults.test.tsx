// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

const summarizerInputs: { role: string; content: string }[][] = [];
vi.mock("../lib/chat/summarize", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/summarize")>();
  return {
    ...orig,
    maybeSummarizeHistory: vi.fn(
      async ({ messages }: { messages: { role: string; content: string }[] }) => {
        summarizerInputs.push(messages.map((m) => ({ role: m.role, content: m.content })));
        return { messagesToConvert: messages, summarySystemMessage: null };
      }
    ),
  };
});

vi.mock("../lib/db/chat", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/db/chat")>();
  return { ...orig, createMessageOp: vi.fn(orig.createMessageOp) };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { createMessageOp } from "../lib/db/chat";
import { TOOL_RESULTS_PREFIX } from "../lib/chat/toolResults";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockCreateMessageOp = vi.mocked(createMessageOp);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `tool-results-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

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

const PEOPLE_RESULT = { people: [{ account_id: "acct_1", display_name: "Ada" }] };

function loopResult(autoExecutedToolResults?: { name: string; result: unknown }[]) {
  return {
    data: responsesShape("Here they are."),
    error: null,
    ...(autoExecutedToolResults ? { autoExecutedToolResults } : {}),
  } as never;
}

async function send(
  result: { current: ReturnType<typeof useChatStorage> },
  text = "find people near me"
) {
  return await act(async () =>
    result.current.sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text }] }],
      model: "test-model",
    })
  );
}

describe("useChatStorage tool-results row (expo)", () => {
  let db: Database;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    summarizerInputs.length = 0;
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("persists the results as a user row parented to the assistant message", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([{ name: "display_people_map", result: PEOPLE_RESULT }])
    );
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_tr", getToken: async () => "tok" })
    );

    const sent = await send(result);

    const stored = await result.current.getMessages("conv_tr");
    const assistant = stored.find((m) => m.role === "assistant");
    const row = stored.find((m) => m.role === "user" && m.content.startsWith(TOOL_RESULTS_PREFIX));

    expect(row).toBeDefined();
    expect(row?.content).toContain('Tool "display_people_map" returned:');
    expect(row?.content).toContain('"display_name":"Ada"');
    expect(row?.parentMessageId).toBe(assistant?.uniqueId);
    expect(sent).toMatchObject({ error: null });
    expect(
      sent && "toolResultsMessage" in sent ? sent.toolResultsMessage?.uniqueId : undefined
    ).toBe(row?.uniqueId);
    expect(
      sent && "autoExecutedToolResults" in sent ? sent.autoExecutedToolResults : undefined
    ).toEqual([{ name: "display_people_map", result: PEOPLE_RESULT }]);
  });

  it("puts every tool of the turn in the one row, in order", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([
        { name: "search_people_nearby", result: { rows_returned: 2 } },
        { name: "display_people_map", result: PEOPLE_RESULT },
      ])
    );
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_multi", getToken: async () => "tok" })
    );

    await send(result);

    const stored = await result.current.getMessages("conv_multi");
    const row = stored.find((m) => m.role === "user" && m.content.startsWith(TOOL_RESULTS_PREFIX));
    expect(row?.content.indexOf('Tool "search_people_nearby"')).toBeGreaterThan(-1);
    expect(row?.content.indexOf('Tool "display_people_map"')).toBeGreaterThan(
      row?.content.indexOf('Tool "search_people_nearby"') ?? 0
    );
  });

  it("writes no row when the turn executed no tools", async () => {
    mockRunToolLoop.mockResolvedValue(loopResult());
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_none", getToken: async () => "tok" })
    );

    const sent = await send(result, "hello");

    const stored = await result.current.getMessages("conv_none");
    expect(stored.filter((m) => m.content.startsWith(TOOL_RESULTS_PREFIX))).toHaveLength(0);
    expect(
      sent && "toolResultsMessage" in sent ? sent.toolResultsMessage : undefined
    ).toBeUndefined();
  });

  it("replays the row folded onto the assistant turn, minus excluded tools", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([
        { name: "search_people_nearby", result: { rows_returned: 1, people: [{ name: "Ada" }] } },
        { name: "display_people_map", result: { people: [{ name: "Ada", lat: 1.5, lng: 2.5 }] } },
      ])
    );
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_replay",
        getToken: async () => "tok",
        toolResultsHistoryExclude: ["display_people_map"],
        foldToolResultsInHistory: true,
      })
    );

    await send(result);
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "which of them likes chess");

    const replayed = mockRunToolLoop.mock.calls[1]![0]!.messages as {
      role: string;
      content: { text?: string }[];
    }[];
    const text = (m: (typeof replayed)[number]) =>
      m.content.map((part) => part.text ?? "").join("");

    expect(
      replayed.filter((m) => m.role === "user" && text(m).includes(TOOL_RESULTS_PREFIX))
    ).toEqual([]);
    const assistantText = replayed
      .filter((m) => m.role === "assistant")
      .map(text)
      .join("\n");
    expect(assistantText).toContain('Tool "search_people_nearby" returned:');
    expect(assistantText).not.toContain("display_people_map");
    expect(assistantText).not.toContain("lat");
  });

  it("folds before summarizing, so an excluded payload never reaches the summary prompt", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([
        { name: "search_people_nearby", result: { rows_returned: 1 } },
        { name: "display_people_map", result: { people: [{ name: "Ada", lat: 1.5, lng: 2.5 }] } },
      ])
    );
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_summary",
        getToken: async () => "tok",
        toolResultsHistoryExclude: ["display_people_map"],
        foldToolResultsInHistory: true,
      })
    );

    await send(result);
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "who was closest?");

    const replayed = summarizerInputs[summarizerInputs.length - 1]!;
    expect(replayed.some((m) => m.content.includes("display_people_map"))).toBe(false);
    expect(replayed.some((m) => m.content.includes("lat"))).toBe(false);
    expect(
      replayed.some((m) => m.role === "user" && m.content.startsWith(TOOL_RESULTS_PREFIX))
    ).toBe(false);
    expect(replayed.some((m) => m.content.includes('Tool "search_people_nearby" returned:'))).toBe(
      true
    );
  });

  it("keeps the send successful when the row write fails", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([{ name: "display_people_map", result: PEOPLE_RESULT }])
    );
    const actual = await vi.importActual<typeof import("../lib/db/chat")>("../lib/db/chat");
    let writes = 0;
    mockCreateMessageOp.mockImplementation(async (ctx, opts) => {
      writes += 1;
      if (writes === 3) throw new Error("row write failed");
      return await actual.createMessageOp(ctx, opts);
    });
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_fail", getToken: async () => "tok" })
    );

    const sent = await send(result);

    expect(sent).toMatchObject({ error: null });
    expect(sent && "assistantMessage" in sent ? sent.assistantMessage : undefined).toBeDefined();
    expect(
      sent && "toolResultsMessage" in sent ? sent.toolResultsMessage : undefined
    ).toBeUndefined();
  });
});
