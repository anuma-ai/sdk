import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionResponse, LlmapiResponseResponse } from "../../../../client";
import type { StreamAccumulator } from "../types";
import { CompletionsStrategy } from "./completions";
import {
  extractAssistantText,
  getCostMicroUsd,
  getCreditsExhausted,
  getCreditsUsed,
  getImageModel,
  getToolCallEvents,
  getToolsChecksum,
} from "./types";

// These tests pin the dual-shape contract introduced when chat completions
// adopted the OpenAI-compliant `portal` envelope:
//
//   1. Outgoing requests nest portal-only fields under `portal`.
//   2. `buildFinalResponse` emits the new portal-nested shape AND mirrors the
//      portal fields back to their legacy top-level / in-usage locations.
//   3. The read helpers return the right value from EITHER shape — the
//      SDK-flattened streaming response (both paths populated) and the
//      wire-only non-streaming response (portal only).
//
// If a future client regen or refactor drops the mirroring, these fail loudly
// instead of silently regressing consumers that still read the legacy paths.

function createAccumulator(overrides: Partial<StreamAccumulator> = {}): StreamAccumulator {
  return {
    content: "",
    thinking: "",
    responseId: "resp_1",
    responseModel: "openai/gpt-4o-mini",
    usage: {},
    toolCalls: new Map(),
    ...overrides,
  };
}

const strategy = new CompletionsStrategy();

describe("CompletionsStrategy.buildRequestBody — portal request envelope", () => {
  const base = {
    messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }],
    model: "openai/gpt-4o-mini",
    stream: true,
  };

  it("nests image_model and conversation_id under `portal`", () => {
    const body = strategy.buildRequestBody({
      ...base,
      imageModel: "flux-1",
      conversationId: "conv_42",
    });

    expect(body.portal).toEqual({ image_model: "flux-1", conversation_id: "conv_42" });
    // Must NOT leak the legacy top-level request fields.
    expect(body.image_model).toBeUndefined();
    expect(body.conversation_id).toBeUndefined();
  });

  it("includes only the provided portal field", () => {
    expect(strategy.buildRequestBody({ ...base, imageModel: "flux-1" }).portal).toEqual({
      image_model: "flux-1",
    });
    expect(strategy.buildRequestBody({ ...base, conversationId: "conv_42" }).portal).toEqual({
      conversation_id: "conv_42",
    });
  });

  it("omits the portal envelope entirely when neither field is set", () => {
    const body = strategy.buildRequestBody(base);
    expect("portal" in body).toBe(false);
  });
});

describe("CompletionsStrategy.buildFinalResponse — dual-shape response", () => {
  it("emits portal-nested AND legacy top-level mirrors for tools/checksum", () => {
    const acc = createAccumulator({
      toolsChecksum: "abc123",
      toolCallEvents: [{ id: "evt_1", name: "search", arguments: "{}", output: "{}" }],
    });

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    // New OpenAI-compliant location.
    expect(res.portal?.tools_checksum).toBe("abc123");
    expect(res.portal?.tool_call_events).toHaveLength(1);
    // Legacy top-level mirror — must stay in lockstep.
    expect(res.tools_checksum).toBe("abc123");
    expect(res.tool_call_events).toHaveLength(1);
    expect(res.tool_call_events).toEqual(res.portal?.tool_call_events);
  });

  it("splits usage: OpenAI tokens in `usage`, cost mirrored into both usage and portal", () => {
    const acc = createAccumulator({
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        cost_micro_usd: 1234,
        credits_used: 1,
      },
    });

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    // Standard OpenAI tokens always live in usage.
    expect(res.usage?.prompt_tokens).toBe(10);
    expect(res.usage?.completion_tokens).toBe(5);
    expect(res.usage?.total_tokens).toBe(15);
    // Cost mirrored into usage (legacy) AND portal (new).
    expect(res.usage?.cost_micro_usd).toBe(1234);
    expect(res.usage?.credits_used).toBe(1);
    expect(res.portal?.cost_micro_usd).toBe(1234);
    expect(res.portal?.credits_used).toBe(1);
  });

  it("omits portal and legacy mirrors entirely when no portal fields are present", () => {
    const acc = createAccumulator({
      content: "hello",
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    expect(res.portal).toBeUndefined();
    expect(res.tools_checksum).toBeUndefined();
    expect(res.tool_call_events).toBeUndefined();
    // OpenAI usage still present, cost fields absent (not zeroed).
    expect(res.usage?.total_tokens).toBe(15);
    expect(res.usage?.cost_micro_usd).toBeUndefined();
  });

  it("surfaces portal image_model in portal AND the legacy top-level mirror", () => {
    const acc = createAccumulator({ content: "hi", imageModel: "flux-1" });
    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    expect(res.portal?.image_model).toBe("flux-1");
    expect(res.image_model).toBe("flux-1");
    expect(getImageModel(res)).toBe("flux-1");
  });

  it("mirrors the full portal cost/usage breakdown into both usage and portal", () => {
    const acc = createAccumulator({
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        cost_micro_usd: 1234,
        credits_used: 1,
        init_prompt_tokens: 8,
        init_completion_tokens: 3,
        provider_cost_micro_usd: 1000,
        pricing_source: "table-v2",
        tool_cost_micro_usd: 200,
      },
    });

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    // Legacy `LlmapiChatCompletionUsage` readers see every field on `usage`...
    expect(res.usage?.init_prompt_tokens).toBe(8);
    expect(res.usage?.init_completion_tokens).toBe(3);
    expect(res.usage?.provider_cost_micro_usd).toBe(1000);
    expect(res.usage?.pricing_source).toBe("table-v2");
    expect(res.usage?.tool_cost_micro_usd).toBe(200);
    // ...and the OpenAI-compliant `portal` carries them too.
    expect(res.portal?.init_prompt_tokens).toBe(8);
    expect(res.portal?.provider_cost_micro_usd).toBe(1000);
    expect(res.portal?.pricing_source).toBe("table-v2");
    expect(res.portal?.tool_cost_micro_usd).toBe(200);
  });

  it("puts message content as a plain string (OpenAI shape, not the legacy array)", () => {
    const res = strategy.buildFinalResponse(
      createAccumulator({ content: "the answer" })
    ) as LlmapiChatCompletionResponse;
    expect(res.choices?.[0]?.message?.content).toBe("the answer");
  });
});

describe("read helpers — dual-shape contract", () => {
  it("read a buildFinalResponse output (both paths populated) via the helpers", () => {
    const res = strategy.buildFinalResponse(
      createAccumulator({
        toolsChecksum: "abc123",
        toolCallEvents: [{ id: "evt_1", name: "search", arguments: "{}", output: "{}" }],
        usage: { prompt_tokens: 10, cost_micro_usd: 1234, credits_used: 1 },
      })
    );

    expect(getToolsChecksum(res)).toBe("abc123");
    expect(getToolCallEvents(res)).toHaveLength(1);
    expect(getCostMicroUsd(res)).toBe(1234);
    expect(getCreditsUsed(res)).toBe(1);
  });

  it("fall back to the portal envelope when legacy mirrors are absent (wire-only)", () => {
    // Mimics a raw non-streaming response from postApiV1ChatCompletions: only
    // the portal-nested shape is populated, no legacy top-level / in-usage copy.
    const wireOnly: LlmapiChatCompletionResponse = {
      id: "resp_1",
      model: "openai/gpt-4o-mini",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "hi" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      portal: {
        tools_checksum: "wire-checksum",
        tool_call_events: [{ id: "evt_9", name: "fetch", arguments: "{}", output: "{}" }],
        cost_micro_usd: 999,
        credits_used: 2,
        image_model: "wire-flux",
      },
    };

    expect(getToolsChecksum(wireOnly)).toBe("wire-checksum");
    expect(getToolCallEvents(wireOnly)).toHaveLength(1);
    expect(getCostMicroUsd(wireOnly)).toBe(999);
    expect(getCreditsUsed(wireOnly)).toBe(2);
    expect(getImageModel(wireOnly)).toBe("wire-flux");
  });

  it("reads image_model from the Responses API top level", () => {
    const responsesShape: LlmapiResponseResponse = {
      id: "resp_1",
      model: "openai/gpt-4o-mini",
      object: "response",
      output: [],
      image_model: "resp-flux",
    };
    expect(getImageModel(responsesShape)).toBe("resp-flux");
  });

  it("read top-level / in-usage fields for the Responses API shape (unchanged)", () => {
    const responsesShape: LlmapiResponseResponse = {
      id: "resp_1",
      model: "openai/gpt-4o-mini",
      object: "response",
      output: [],
      tools_checksum: "resp-checksum",
      tool_call_events: [{ id: "evt_r", name: "search", arguments: "{}", output: "{}" }],
      usage: { prompt_tokens: 10, cost_micro_usd: 555, credits_used: 3 },
    };

    expect(getToolsChecksum(responsesShape)).toBe("resp-checksum");
    expect(getToolCallEvents(responsesShape)).toHaveLength(1);
    expect(getCostMicroUsd(responsesShape)).toBe(555);
    expect(getCreditsUsed(responsesShape)).toBe(3);
  });

  it("classifies a chat-completion error envelope WITHOUT `choices` as chat completion", () => {
    // Regression: keying the discriminator on `"choices" in r` misclassified
    // this as a Responses response, so its portal fields were silently dropped.
    const errorEnvelope: LlmapiChatCompletionResponse = {
      id: "resp_err",
      object: "chat.completion",
      // no `choices` — e.g. an upstream error envelope
      portal: {
        tools_checksum: "still-readable",
        tool_call_events: [{ id: "evt_e", name: "x", arguments: "{}", output: "{}" }],
        cost_micro_usd: 7,
        credits_used: 1,
      },
    };

    expect(getToolsChecksum(errorEnvelope)).toBe("still-readable");
    expect(getToolCallEvents(errorEnvelope)).toHaveLength(1);
    expect(getCostMicroUsd(errorEnvelope)).toBe(7);
    expect(getCreditsUsed(errorEnvelope)).toBe(1);
  });

  it("still classifies a Responses response by `output` when `object` is absent", () => {
    // SDK-built Responses streams may omit `object`; the `output` array alone
    // must still route to the top-level read path.
    const responsesNoObject = {
      id: "resp_2",
      output: [],
      tools_checksum: "resp-checksum",
      usage: { cost_micro_usd: 42 },
    } as unknown as LlmapiResponseResponse;

    expect(getToolsChecksum(responsesNoObject)).toBe("resp-checksum");
    expect(getCostMicroUsd(responsesNoObject)).toBe(42);
  });
});

describe("extractAssistantText — both response shapes", () => {
  it("reads string content from a Chat Completions response", () => {
    const res = strategy.buildFinalResponse(createAccumulator({ content: "streamed text" }));
    expect(extractAssistantText(res)).toEqual({ content: "streamed text" });
  });

  it("reads legacy array-form content from a Chat Completions response", () => {
    const legacyArrayShape: LlmapiChatCompletionResponse = {
      id: "resp_1",
      choices: [
        {
          index: 0,
          // Older completion-format payloads use a content-part array.
          message: {
            role: "assistant",
            content: [{ text: "part A" }, { text: "part B" }] as never,
          },
        },
      ],
    };
    expect(extractAssistantText(legacyArrayShape).content).toBe("part Apart B");
  });

  it("reads message + reasoning from a Responses API response", () => {
    const responsesShape: LlmapiResponseResponse = {
      id: "resp_1",
      object: "response",
      output: [
        { type: "reasoning", content: [{ text: "thinking..." }] },
        { type: "message", content: [{ text: "final answer" }] },
      ] as never,
    };
    expect(extractAssistantText(responsesShape)).toEqual({
      content: "final answer",
      thinking: "thinking...",
    });
  });
});

describe("processStreamChunk — usage cost fields are not clobbered", () => {
  it("keeps cost/credits from an earlier chunk when a later usage frame omits them", () => {
    const acc = createAccumulator();

    // First usage frame carries cost.
    strategy.processStreamChunk(
      { usage: { prompt_tokens: 10, cost_micro_usd: 1234, credits_used: 1 } },
      acc
    );
    expect(acc.usage.cost_micro_usd).toBe(1234);
    expect(acc.usage.credits_used).toBe(1);

    // Later frame updates token counts but omits cost — must not wipe it.
    strategy.processStreamChunk(
      { usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } },
      acc
    );

    expect(acc.usage.total_tokens).toBe(20);
    expect(acc.usage.cost_micro_usd).toBe(1234);
    expect(acc.usage.credits_used).toBe(1);
  });

  it("keeps token counts from an earlier chunk when a later usage frame omits them", () => {
    const acc = createAccumulator();

    // First frame carries full token counts.
    strategy.processStreamChunk(
      { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
      acc
    );

    // Later frame carries only prompt_tokens (e.g. a portal mirror) — must not
    // wipe completion/total the earlier frame already set.
    strategy.processStreamChunk({ usage: { prompt_tokens: 12 } }, acc);

    expect(acc.usage.prompt_tokens).toBe(12);
    expect(acc.usage.completion_tokens).toBe(5);
    expect(acc.usage.total_tokens).toBe(15);
  });

  it("does not let an empty-string tools_checksum shadow a real one on a later carrier", () => {
    const acc = createAccumulator();
    // Top-level carrier carries an empty checksum; the nested `portal` carrier
    // (consulted later) carries the real one. The empty string must not win.
    strategy.processStreamChunk(
      { tools_checksum: "", portal: { tools_checksum: "real-checksum" } },
      acc
    );
    expect(acc.toolsChecksum).toBe("real-checksum");
  });

  it("merges cost/credits arriving via the portal fallback envelope", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      { portal: { cost_micro_usd: 500, credits_used: 5, tools_checksum: "pc" } },
      acc
    );
    expect(acc.usage.cost_micro_usd).toBe(500);
    expect(acc.usage.credits_used).toBe(5);
    expect(acc.toolsChecksum).toBe("pc");
  });

  it("captures image_model and the cost/usage breakdown from the portal envelope", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        portal: {
          image_model: "flux-1",
          init_prompt_tokens: 8,
          provider_cost_micro_usd: 1000,
          pricing_source: "table-v2",
          tool_cost_micro_usd: 200,
        },
      },
      acc
    );
    expect(acc.imageModel).toBe("flux-1");
    expect(acc.usage.init_prompt_tokens).toBe(8);
    expect(acc.usage.provider_cost_micro_usd).toBe(1000);
    expect(acc.usage.pricing_source).toBe("table-v2");
    expect(acc.usage.tool_cost_micro_usd).toBe(200);
  });

  it("passes credits_exhausted through the accumulator and into the final usage", () => {
    const acc = createAccumulator();
    // ai-portal injects credits_exhausted into the flat `usage` frame on the
    // out-of-credits wrap-up. It must accumulate and survive to the final usage.
    strategy.processStreamChunk(
      {
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          credits_exhausted: true,
        },
      },
      acc
    );
    expect(acc.usage.credits_exhausted).toBe(true);

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;
    // Lives on `usage` (terminal boolean), readable via the helper.
    expect((res.usage as { credits_exhausted?: boolean }).credits_exhausted).toBe(true);
    expect(getCreditsExhausted(res)).toBe(true);
  });

  it("leaves credits_exhausted undefined when the stream never signals it", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
      acc
    );
    expect(acc.usage.credits_exhausted).toBeUndefined();

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;
    expect(getCreditsExhausted(res)).toBeUndefined();
  });

  it("never writes undefined-valued token keys from an empty usage frame", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ usage: {} }, acc);
    // An empty frame must leave the accumulator empty, not seed it with
    // undefined-valued token keys that would make `hasUsage` falsely true.
    expect(Object.keys(acc.usage)).toHaveLength(0);
  });

  it("emits no token keys for a cost-only response (not prompt_tokens: undefined)", () => {
    const acc = createAccumulator({ content: "hi" });
    // Portal fallback delivers cost only — no per-chunk OpenAI token frame.
    strategy.processStreamChunk({ portal: { cost_micro_usd: 500, credits_used: 5 } }, acc);

    const res = strategy.buildFinalResponse(acc) as LlmapiChatCompletionResponse;

    // Cost still surfaces in both legacy-usage and portal locations.
    expect(res.usage?.cost_micro_usd).toBe(500);
    expect(res.usage?.credits_used).toBe(5);
    expect(res.portal?.cost_micro_usd).toBe(500);
    // Token keys must be absent entirely, not present-with-undefined.
    expect(res.usage && "prompt_tokens" in res.usage).toBe(false);
    expect(res.usage && "completion_tokens" in res.usage).toBe(false);
    expect(res.usage && "total_tokens" in res.usage).toBe(false);
  });
});
