// @vitest-environment happy-dom
/**
 * Expo parity for the `[Tool Execution Results]` row (#5519).
 *
 * The react entry has always persisted a turn's `autoExecutedToolResults` as a synthetic `role: "user"`
 * row so a reopened conversation can re-render its display cards; the expo entry wrote nothing, so on
 * mobile every tool-backed card had to hand-roll the row — and whatever it did not hand-roll was gone
 * on reopen, model context included.
 *
 * What these lock down: the row exists, carries the shared wrapper, is parented to the ASSISTANT
 * message (mobile walks a parent/child branch to build its visible list, so a row hung off the user
 * prompt is written and never rendered), is returned to the caller so it need not derive the id, and
 * never turns a stored assistant reply into a failed send.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

// Records what the summarizer is handed. An excluded display payload reaching it is egress in its own
// right: it goes into the summary prompt, and whatever the summary keeps comes back to the main model.
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

// The row goes through `createMessageOp` like every other write; spying on the module lets one case
// fail JUST that write while leaving the user/assistant rows intact.
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
    // getServerTools is the only network call on this path; fail it fast.
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
    // The anchor is load-bearing: mobile renders only the walked branch.
    expect(row?.parentMessageId).toBe(assistant?.uniqueId);
    // Returned, so a caller keys its overlay on the id the SDK wrote rather than deriving one.
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
        // The card's payload exists for the renderer and carries coordinates the search result strips.
        toolResultsHistoryExclude: ["display_people_map"],
      })
    );

    await send(result);
    // Second turn replays the stored thread.
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "which of them likes chess");

    const replayed = mockRunToolLoop.mock.calls[1]![0]!.messages as {
      role: string;
      content: { text?: string }[];
    }[];
    const text = (m: (typeof replayed)[number]) =>
      m.content.map((part) => part.text ?? "").join("");

    // No synthetic user turn on the wire — that is what made the model answer the previous turn.
    expect(
      replayed.filter((m) => m.role === "user" && text(m).includes(TOOL_RESULTS_PREFIX))
    ).toEqual([]);
    const assistantText = replayed
      .filter((m) => m.role === "assistant")
      .map(text)
      .join("\n");
    // The model keeps what it reasoned over…
    expect(assistantText).toContain('Tool "search_people_nearby" returned:');
    // …and never gets the coordinates back.
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
      })
    );

    await send(result);
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "who was closest?");

    // Second send replays the stored thread; the summarizer sees the FOLDED rows.
    const replayed = summarizerInputs[summarizerInputs.length - 1]!;
    expect(replayed.some((m) => m.content.includes("display_people_map"))).toBe(false);
    expect(replayed.some((m) => m.content.includes("lat"))).toBe(false);
    // No synthetic user row survives to be summarized either — folding already moved its content.
    expect(
      replayed.some((m) => m.role === "user" && m.content.startsWith(TOOL_RESULTS_PREFIX))
    ).toBe(false);
    // …and what the model is allowed to keep is still there.
    expect(replayed.some((m) => m.content.includes('Tool "search_people_nearby" returned:'))).toBe(
      true
    );
  });

  it("keeps the send successful when the row write fails", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([{ name: "display_people_map", result: PEOPLE_RESULT }])
    );
    const actual = await vi.importActual<typeof import("../lib/db/chat")>("../lib/db/chat");
    // Third write of the send is the tool-results row (user, assistant, row).
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
