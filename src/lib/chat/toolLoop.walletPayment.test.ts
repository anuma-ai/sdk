import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import {
  FLIGHT_SERVER_TOOL_NAMES,
  SELECT_PAYMENT_WALLET_TOOL_NAME,
  WALLET_PAYMENT_TOOL_NAME,
} from "../../tools/walletPaymentConstants";
import * as embeddingsModule from "../memoryEngine/embeddings";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/serverTools";
import type { LlmapiMessage } from "../../client";
import type { UIInteractionContext } from "../../tools/uiInteraction";
import { createWalletPaymentTool } from "../../tools/walletPayment";
import type { ModelCallStartEvent } from "./runHooks";
import { runToolLoop } from "./toolLoop";

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
const NOTION = "notion_search";
const SELECT = SELECT_PAYMENT_WALLET_TOOL_NAME;
const PAY = WALLET_PAYMENT_TOOL_NAME;
const FLIGHTS = [...FLIGHT_SERVER_TOOL_NAMES];

function makeClientToolStream(callId: string, name: string, args = "{}") {
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
      arguments: args,
    };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 10, output_tokens: 10 }, tool_call_events: [] },
    };
  })();
}

function makeTextStream(text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
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

const toolSearch = { type: "tool_search_tool_regex_20251119", name: TOOL_SEARCH_TOOL_NAME };

async function captureToolNames(tools: Array<Record<string, unknown>>): Promise<string[][]> {
  const requests: string[][] = [];
  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "book the flight" }] }],
    model: "test-model",
    token: "token",
    tools,
    hooks: {
      beforeModelCall: (e: ModelCallStartEvent) => {
        const body = e.requestBody as { tools?: Array<{ name: string }> };
        requests.push((body.tools ?? []).map((t) => t.name));
      },
    },
  });
  expect(result.error).toBeNull();
  return requests;
}

function flightTurnTools(selectResult: unknown, payExecutor = vi.fn().mockResolvedValue({})) {
  return [
    ...FLIGHTS.map(serverTool),
    serverTool(FIND),
    clientTool(NOTION, async () => ({ results: [] })),
    clientTool(SELECT, async () => selectResult),
    clientTool(PAY, payExecutor),
    toolSearch,
  ];
}

const ROUND_ONE = [...FLIGHTS, FIND, NOTION, SELECT, PAY, TOOL_SEARCH_TOOL_NAME];

describe("runToolLoop after a wallet choice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSseClient.mockReset();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("narrows to the flight tools and both payment tools after a confirmed choice", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", SELECT) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("pick passengers") } as never);

    const requests = await captureToolNames(
      flightTurnTools({ confirmed: true, offer_id: "off_1", funding_wallet: "w1" })
    );

    expect(requests[0]).toEqual(ROUND_ONE);
    expect([...requests[1]].sort()).toEqual(
      [...FLIGHTS, SELECT, PAY, TOOL_SEARCH_TOOL_NAME].sort()
    );
  });

  it("keeps the payment tool's executor after narrowing", async () => {
    const payExecutor = vi.fn().mockResolvedValue({ cancelled: true });
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", SELECT) } as never)
      .mockReturnValueOnce({ stream: makeClientToolStream("c2", PAY) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    await captureToolNames(
      flightTurnTools({ confirmed: true, offer_id: "off_1", funding_wallet: "w1" }, payExecutor)
    );

    expect(payExecutor).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a cancelled choice", { cancelled: true }],
    ["a declined choice", { confirmed: false }],
  ])("leaves the tools unchanged after %s", async (_label, result) => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", SELECT) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const requests = await captureToolNames(flightTurnTools(result));

    expect(requests[1]).toEqual(ROUND_ONE);
  });

  it("leaves the tools unchanged when no flight tool is on offer", async () => {
    const tools = [
      serverTool(FIND),
      clientTool(NOTION, async () => ({ results: [] })),
      clientTool(SELECT, async () => ({
        confirmed: true,
        offer_id: "off_1",
        funding_wallet: "w1",
      })),
      clientTool(PAY, async () => ({})),
    ];
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", SELECT) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const requests = await captureToolNames(tools);

    expect(requests[1]).toEqual([FIND, NOTION, SELECT, PAY]);
  });

  it("still narrows a confirmed restaurant booking to the restaurant tools only", async () => {
    const tools = [
      serverTool(FIND),
      serverTool(AVAILABILITY),
      serverTool(BOOK),
      ...FLIGHTS.map(serverTool),
      clientTool(SELECT, async () => ({})),
      clientTool(PAY, async () => ({})),
      clientTool(CONFIRM, async () => ({
        confirmed: true,
        action: "book_restaurant",
        parameters: [{ name: "party_size", label: "Party size", value: "2" }],
        answeredAt: "2026-09-29T12:00:00.000Z",
      })),
      toolSearch,
    ];
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", CONFIRM) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const requests = await captureToolNames(tools);

    expect(requests[1]).toEqual([FIND, AVAILABILITY, BOOK, CONFIRM, TOOL_SEARCH_TOOL_NAME]);
  });
});

function pendingContext() {
  let settle!: { answer: (result: unknown) => void; fail: (error: Error) => void };
  const createInteraction = vi.fn(
    (_id: string, _type: string, _data: unknown) =>
      new Promise<unknown>((resolve, reject) => {
        settle = { answer: resolve, fail: reject };
      })
  );

  const context: UIInteractionContext = {
    createInteraction,
    createDisplayInteraction: vi.fn(),
  };

  return { context, createInteraction, settle: () => settle };
}

describe("prompt_wallet_payment with the real executor", () => {
  const PAYMENT_ARGS = '{"provider":"brij","reference":"ref_1","passenger_count":1}';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSseClient.mockReset();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  function startPaymentTurn() {
    const { context, createInteraction, settle } = pendingContext();
    const pay = vi
      .fn()
      .mockResolvedValue({ paid: true, provider: "brij", reference: "ref_1", status: "confirmed" });
    const tool = createWalletPaymentTool({ getContext: () => context, pay });
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeClientToolStream("c1", PAY, PAYMENT_ARGS) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);
    const inputs: LlmapiMessage[][] = [];
    const loop = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "pay for the flight" }] }],
      model: "test-model",
      token: "token",
      tools: [tool as unknown as Record<string, unknown>],
      hooks: {
        beforeModelCall: (e: ModelCallStartEvent) => {
          inputs.push((e.requestBody as { input: LlmapiMessage[] }).input);
        },
      },
    });
    const toolResult = () => {
      const message = inputs[1].find(
        (m) => (m as { tool_call_id?: string }).tool_call_id === "c1"
      ) as { content: Array<{ text: string }> };
      return { text: message.content[0].text, parsed: JSON.parse(message.content[0].text) };
    };
    return { createInteraction, settle, pay, loop, toolResult };
  }

  it("pays once, after the card is answered", async () => {
    const { createInteraction, settle, pay, loop, toolResult } = startPaymentTurn();

    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    expect(pay).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 20));
    settle().answer({ passengers: [{ given_name: "FAKE" }] });
    const result = await loop;

    expect(result.error).toBeNull();
    expect(pay).toHaveBeenCalledTimes(1);
    const { text, parsed } = toolResult();
    expect(Object.keys(parsed).sort()).toEqual(["paid", "provider", "reference", "status"]);
    expect(text).not.toContain("FAKE");
  });

  it("never pays when the card is cancelled", async () => {
    const { createInteraction, settle, pay, loop, toolResult } = startPaymentTurn();

    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    settle().answer({ cancelled: true });
    const result = await loop;

    expect(result.error).toBeNull();
    expect(pay).not.toHaveBeenCalled();
    expect(toolResult().parsed).toEqual({ cancelled: true });
  });
});
