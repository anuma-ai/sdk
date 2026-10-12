import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import { CONFIRM_REQUIRED_FIELDS } from "../../tools/confirmConstants";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { ModelCallStartEvent } from "./runHooks";
import bookingTurn from "./fixtures/bookingTurnToolCallEvents.json";
import { runToolLoop, toolsAfterConfirmation } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

vi.mock("../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);
const mockGenerateEmbedding = vi.mocked(embeddingsModule.generateEmbedding);

const CONFIRM = "prompt_user_confirm";
const FIND = "AnumaPaymentsMCP-anuma_find_restaurant";
const AVAILABILITY = "AnumaPaymentsMCP-anuma_check_restaurant_availability";
const BOOK = "AnumaPaymentsMCP-anuma_book_restaurant";
const LIST = "AnumaPaymentsMCP-anuma_list_reservations";
const CANCEL = "AnumaPaymentsMCP-anuma_cancel_reservation";
const DISCOVER = "AnumaPaymentsMCP-anuma_discover_restaurants";
const NEARBY = "AnumaNearbyMCP-nearby_search";
const WEATHER = "get_weather";
const RESTAURANT_TOOLS = [FIND, AVAILABILITY, BOOK];

type ToolCallEvent = { id: string; name: string; arguments: string; output?: string };

function makeClientToolStream(callId: string, name: string, events: ToolCallEvent[] = []) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: { id: `item_${callId}`, call_id: callId, type: "function_call", name, arguments: "" },
    };
    yield {
      type: "response.function_call_arguments.done",
      item_id: `item_${callId}`,
      call_id: callId,
      arguments: "{}",
    };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 10, output_tokens: 10 }, tool_call_events: events },
    };
  })();
}

function makeTextStream(text: string, events?: ToolCallEvent[]) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 }, tool_call_events: events },
    };
  })();
}

function serverTool(name: string) {
  return { type: "function", name, description: name, parameters: { type: "object" } };
}

function clientTool(name: string, executor: () => Promise<unknown>) {
  return {
    type: "function" as const,
    function: { name, parameters: { type: "object", properties: {} } },
    executor,
  };
}

function answer(confirmed: boolean, action: string) {
  return {
    confirmed,
    action,
    parameters: [{ name: "party_size", label: "Party size", value: "2" }],
    answeredAt: "2026-09-29T12:00:00.000Z",
  };
}

function completeAnswer(confirmed: boolean, action: string) {
  const fields = CONFIRM_REQUIRED_FIELDS.get(action.toLowerCase())?.fields ?? [];
  return {
    ...answer(confirmed, action),
    parameters: fields.map((name) => ({ name, label: name, value: "1" })),
  };
}

type Captured = { tools: string[]; toolChoice: unknown };

async function captureRequests(
  tools: Array<Record<string, unknown>>,
  toolChoice?: string
): Promise<Captured[]> {
  return (await runCapturing(tools, toolChoice)).requests;
}

async function runCapturing(tools: Array<Record<string, unknown>>, toolChoice?: string) {
  const requests: Captured[] = [];
  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "book sushi for two" }] }],
    model: "test-model",
    token: "token",
    tools,
    toolChoice,
    hooks: {
      beforeModelCall: (e: ModelCallStartEvent) => {
        const body = e.requestBody as { tools?: Array<{ name: string }>; tool_choice?: unknown };
        requests.push({
          tools: (body.tools ?? []).map((t) => t.name),
          toolChoice: body.tool_choice,
        });
      },
    },
  });
  expect(result.error).toBeNull();
  return { requests, result };
}

function scriptConfirmThenText() {
  mockCreateSseClient
    .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
    .mockReturnValueOnce({ stream: makeTextStream("done") } as never);
}

describe("runToolLoop after a confirmed booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("offers only the restaurant tools and the confirm tool for the rest of the turn", async () => {
    const confirmExecutor = vi
      .fn()
      .mockResolvedValueOnce(answer(true, "book_restaurant"))
      .mockResolvedValueOnce({ cancelled: true });
    const tools = [
      serverTool(FIND),
      serverTool(AVAILABILITY),
      serverTool(BOOK),
      serverTool(NEARBY),
      clientTool(WEATHER, async () => ({ temp: 20 })),
      clientTool(CONFIRM, confirmExecutor),
    ];
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
      .mockReturnValueOnce({
        stream: makeClientToolStream("c2", CONFIRM, [
          { id: "s1", name: FIND, arguments: "{}", output: '{"restaurants":[]}' },
        ]),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("booked") } as never);

    const requests = await captureRequests(tools);

    expect(requests).toHaveLength(3);
    expect(requests[0].tools).toEqual([FIND, AVAILABILITY, BOOK, NEARBY, WEATHER, CONFIRM]);
    expect(requests[1].tools).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
    expect(requests[2].tools).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
  });

  it("offers only the list and cancel tools after a confirmed cancel", async () => {
    const tools = [
      serverTool(FIND),
      serverTool(AVAILABILITY),
      serverTool(BOOK),
      serverTool(DISCOVER),
      serverTool(LIST),
      serverTool(CANCEL),
      serverTool(NEARBY),
      clientTool(CONFIRM, async () => answer(true, "cancel_reservation")),
    ];
    scriptConfirmThenText();

    const requests = await captureRequests(tools);

    expect(requests[1].tools).toEqual([LIST, CANCEL, CONFIRM]);
  });

  it("no longer runs a client tool the narrowing removed", async () => {
    const weatherExecutor = vi.fn().mockResolvedValue({ temp: 20 });
    const tools = [
      serverTool(FIND),
      clientTool(WEATHER, weatherExecutor),
      clientTool(CONFIRM, async () => answer(true, "book_restaurant")),
    ];
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
      .mockReturnValueOnce({ stream: makeClientToolStream("c2", WEATHER) } as never);

    await captureRequests(tools);

    expect(weatherExecutor).not.toHaveBeenCalled();
  });

  it("moves a tool_choice naming a removed tool to auto", async () => {
    const tools = [
      serverTool(FIND),
      clientTool(WEATHER, async () => ({ temp: 20 })),
      clientTool(CONFIRM, async () => answer(true, "book_restaurant")),
    ];
    scriptConfirmThenText();

    const requests = await captureRequests(tools, WEATHER);

    expect(requests[0].toolChoice).toBe(WEATHER);
    expect(requests[1].toolChoice).toBe("auto");
  });

  it.each([
    ["another action", answer(true, "place_order")],
    ["a decline", answer(false, "book_restaurant")],
    ["a decline of a complete card", completeAnswer(false, "book_restaurant")],
    ["a cancelled card", { cancelled: true }],
    ["a non-boolean answer", { ...answer(true, "book_restaurant"), confirmed: "yes" }],
  ])("leaves the tools unchanged after %s", async (_label, result) => {
    const tools = [serverTool(FIND), serverTool(NEARBY), clientTool(CONFIRM, async () => result)];
    scriptConfirmThenText();

    const requests = await captureRequests(tools);

    expect(requests[1].tools).toEqual([FIND, NEARBY, CONFIRM]);
  });

  it("drops the confirm tool after a complete booking card", async () => {
    const tools = [
      serverTool(FIND),
      serverTool(AVAILABILITY),
      serverTool(BOOK),
      serverTool(NEARBY),
      clientTool(CONFIRM, async () => completeAnswer(true, "book_restaurant")),
    ];
    scriptConfirmThenText();

    const requests = await captureRequests(tools);

    expect(requests[1].tools).toEqual(RESTAURANT_TOOLS);
  });

  it("drops the confirm tool after a complete cancel card", async () => {
    const tools = [
      serverTool(LIST),
      serverTool(CANCEL),
      serverTool(NEARBY),
      clientTool(CONFIRM, async () => completeAnswer(true, "cancel_reservation")),
    ];
    scriptConfirmThenText();

    const requests = await captureRequests(tools);

    expect(requests[1].tools).toEqual([LIST, CANCEL]);
  });

  it("ends the turn on the model's text when the confirmed booking then fails", async () => {
    const tools = [
      ...RESTAURANT_TOOLS.map(serverTool),
      clientTool(CONFIRM, async () => completeAnswer(true, "book_restaurant")),
    ];
    const failedBook = {
      id: "s-book",
      name: BOOK,
      arguments: "{}",
      output: '{"success":false,"cost":0,"error":"that time is no longer available"}',
    };
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
      .mockReturnValueOnce({
        stream: makeTextStream("It is not booked yet: that time was just taken.", [failedBook]),
      } as never);

    const { requests, result } = await runCapturing(tools);

    expect(requests).toHaveLength(2);
    expect(requests[1].tools).toEqual(RESTAURANT_TOOLS);
    const output = (result.data as { output: Array<{ content?: Array<{ text: string }> }> }).output;
    expect(output.at(-1)?.content?.[0]?.text).toBe(
      "It is not booked yet: that time was just taken."
    );
  });

  it("returns the booking result the portal reports with the final answer", async () => {
    const tools = [
      ...RESTAURANT_TOOLS.map(serverTool),
      clientTool(CONFIRM, async () => completeAnswer(true, "book_restaurant")),
    ];
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("Booked.", bookingTurn) } as never);

    const { result } = await runCapturing(tools);

    expect((result.data as { tool_call_events?: unknown }).tool_call_events).toEqual(bookingTurn);
  });

  it("leaves the tools unchanged when no restaurant tool is on offer", async () => {
    const tools = [
      serverTool(NEARBY),
      clientTool(CONFIRM, async () => answer(true, "book_restaurant")),
    ];
    scriptConfirmThenText();

    const requests = await captureRequests(tools);

    expect(requests[1].tools).toEqual([NEARBY, CONFIRM]);
  });
});

describe("toolsAfterConfirmation", () => {
  const apiTools = [FIND, AVAILABILITY, BOOK, NEARBY, WEATHER, CONFIRM].map(serverTool);
  const names = (tools: Array<Record<string, unknown>> | undefined) => tools?.map((t) => t.name);

  it.each(["book_restaurant", "anuma_book_restaurant", "AnumaPaymentsMCP-anuma_book_restaurant"])(
    "narrows to the booking set for %s",
    (action) => {
      const narrowed = toolsAfterConfirmation(apiTools, [
        { name: CONFIRM, result: answer(true, action) },
      ]);
      expect(names(narrowed)).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
    }
  );

  it.each(["book_restaurant", "anuma_book_restaurant", "AnumaPaymentsMCP-anuma_book_restaurant"])(
    "does not offer the discovery or cancel tools after %s",
    (action) => {
      const withCancel = [...apiTools, ...[LIST, CANCEL, DISCOVER].map(serverTool)];
      const narrowed = toolsAfterConfirmation(withCancel, [
        { name: CONFIRM, result: answer(true, action) },
      ]);
      expect(names(narrowed)).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
    }
  );

  it.each([
    "cancel_reservation",
    "anuma_cancel_reservation",
    "AnumaPaymentsMCP-anuma_cancel_reservation",
  ])("narrows to the list and cancel tools for %s", (action) => {
    const withCancel = [...apiTools, ...[LIST, CANCEL, DISCOVER].map(serverTool)];
    const narrowed = toolsAfterConfirmation(withCancel, [
      { name: CONFIRM, result: answer(true, action) },
    ]);
    expect(names(narrowed)).toEqual([CONFIRM, LIST, CANCEL]);
  });

  it("matches the action case-insensitively and ignores surrounding spaces", () => {
    const narrowed = toolsAfterConfirmation(apiTools, [
      { name: CONFIRM, result: answer(true, "  Book_Restaurant ") },
    ]);
    expect(names(narrowed)).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
  });

  it("keeps the tool-search tool so deferred members can still load", () => {
    const withSearch = [
      { type: "tool_search_tool_regex_20251119", name: "tool_search_tool_regex" },
      ...apiTools,
    ];
    const narrowed = toolsAfterConfirmation(withSearch, [
      { name: CONFIRM, result: answer(true, "book_restaurant") },
    ]);
    expect(names(narrowed)).toEqual(["tool_search_tool_regex", ...RESTAURANT_TOOLS, CONFIRM]);
  });

  it("reads tools in the nested completions format too", () => {
    const nested = [FIND, NEARBY, CONFIRM].map((name) => ({
      type: "function",
      function: { name },
    }));
    const narrowed = toolsAfterConfirmation(nested, [
      { name: CONFIRM, result: answer(true, "book_restaurant") },
    ]);
    expect(narrowed?.map((t) => (t.function as { name: string }).name)).toEqual([FIND, CONFIRM]);
  });

  it.each([
    ["another action", { name: CONFIRM, result: answer(true, "place_order") }],
    ["a decline", { name: CONFIRM, result: answer(false, "book_restaurant") }],
    ["a cancelled card", { name: CONFIRM, result: { cancelled: true } }],
    [
      "a non-boolean answer",
      { name: CONFIRM, result: { confirmed: "true", action: "book_restaurant" } },
    ],
    ["a missing action", { name: CONFIRM, result: { confirmed: true } }],
    ["no result", { name: CONFIRM }],
    ["another tool's result", { name: WEATHER, result: answer(true, "book_restaurant") }],
  ])("returns undefined for %s", (_label, result) => {
    expect(toolsAfterConfirmation(apiTools, [result])).toBeUndefined();
  });

  it.each([
    ["book_restaurant", RESTAURANT_TOOLS],
    ["AnumaPaymentsMCP-anuma_cancel_reservation", [LIST, CANCEL]],
  ])("leaves out the confirm tool after a complete %s card", (action, kept) => {
    const withCancel = [...apiTools, ...[LIST, CANCEL].map(serverTool)];
    const narrowed = toolsAfterConfirmation(withCancel, [
      { name: CONFIRM, result: completeAnswer(true, action) },
    ]);
    expect(names(narrowed)).toEqual(kept);
  });

  it("keeps the confirm tool when any approved card lacked a field", () => {
    const narrowed = toolsAfterConfirmation(apiTools, [
      { name: CONFIRM, result: completeAnswer(true, "book_restaurant") },
      { name: CONFIRM, result: answer(true, "book_restaurant") },
    ]);
    expect(names(narrowed)).toEqual([...RESTAURANT_TOOLS, CONFIRM]);
  });

  it("returns undefined when no set member is on offer", () => {
    const narrowed = toolsAfterConfirmation([NEARBY, CONFIRM].map(serverTool), [
      { name: CONFIRM, result: answer(true, "book_restaurant") },
    ]);
    expect(narrowed).toBeUndefined();
  });
});
