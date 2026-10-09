import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSseClient } from "../client/core/serverSentEvents.gen";
import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import type { RunHooks } from "../lib/chat/runHooks";
import { xhrTransport } from "../lib/chat/xhrTransport";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { createMetricsHooks } from "../telemetry";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";

vi.mock("../client/core/serverSentEvents.gen", async (importOriginal) => {
  const original = await importOriginal<typeof import("../client/core/serverSentEvents.gen")>();
  return { ...original, createSseClient: vi.fn() };
});

vi.mock("../lib/chat/xhrTransport", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/chat/xhrTransport")>();
  return { ...original, xhrTransport: vi.fn() };
});

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `run-hooks-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function modelStream(toolCall: boolean, advance: () => void = () => {}) {
  return (async function* () {
    yield { type: "response.created", response: { id: "response-1", model: "test-model" } };
    if (toolCall) {
      yield {
        type: "response.output_item.added",
        item: {
          id: "item-1",
          type: "function_call",
          name: "test_tool",
          call_id: "call-1",
          arguments: "",
        },
      };
      yield {
        type: "response.function_call_arguments.done",
        item_id: "item-1",
        call_id: "call-1",
        arguments: "{}",
      };
    } else {
      yield { type: "response.output_text.delta", delta: { OfString: "done" } };
    }
    advance();
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 10, output_tokens: 5 } },
    };
  })();
}

const platforms = [
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const;

const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }];

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe.each(platforms)("useChatStorage RunHooks (%s)", (_platform, useChatStorage) => {
  const transport = _platform === "react" ? vi.mocked(createSseClient) : vi.mocked(xhrTransport);
  describe.each([false, true])("skipStorage=%s", (skipStorage) => {
    it.each(["single", "array"] as const)(
      "emits model and tool timings with %s hooks",
      async (shape) => {
        let now = 0;
        const advanceModel = () => {
          now += 7;
        };
        transport
          .mockReturnValueOnce({ stream: modelStream(true, advanceModel) })
          .mockReturnValueOnce({ stream: modelStream(false, advanceModel) });

        const track = vi.fn();
        const metrics = createMetricsHooks({ track }, { now: () => now });
        const observer: RunHooks = {
          afterModelCall: vi.fn(),
          afterToolUse: vi.fn(),
          onRunEnd: vi.fn(),
        };
        const database = makeDatabase();
        const onData = vi.fn();
        const onFinish = vi.fn();
        const executor = vi.fn(async () => {
          now += 11;
          return "ok";
        });
        const { result } = renderHook(() =>
          useChatStorage({
            database,
            getToken: async () => "token",
            autoEmbedMessages: false,
            enableQueue: false,
            smoothing: false,
            onData,
            onFinish,
            hooks: shape === "single" ? metrics : [metrics, observer],
          })
        );

        await act(async () => {
          const response = await result.current.sendMessage({
            messages,
            model: "test-model",
            apiType: "responses",
            skipStorage,
            serverTools: [],
            clientToolsFilter: () => ["test_tool"],
            clientTools: [
              {
                type: "function",
                function: { name: "test_tool", parameters: { type: "object", properties: {} } },
                executor,
              },
            ],
          });
          expect(response.error).toBeNull();
        });

        expect(executor).toHaveBeenCalledTimes(1);
        expect(onData).toHaveBeenCalledWith("done");
        expect(onFinish).toHaveBeenCalledTimes(1);
        const runId = expect.any(String);
        expect(track.mock.calls).toEqual([
          ["run.started", { runId, model: "test-model" }],
          [
            "model.call.completed",
            {
              runId,
              stepIndex: 0,
              latencyMs: 7,
              model: "test-model",
              inputTokens: 10,
              outputTokens: 5,
            },
          ],
          [
            "tool.call.completed",
            { runId, stepIndex: 0, toolCallId: "call-1", toolName: "test_tool", durationMs: 11 },
          ],
          [
            "model.call.completed",
            {
              runId,
              stepIndex: 1,
              latencyMs: 7,
              model: "test-model",
              inputTokens: 10,
              outputTokens: 5,
            },
          ],
          ["run.completed", { runId, totalSteps: 2, durationMs: 25 }],
        ]);
        expect(new Set(track.mock.calls.map(([, properties]) => properties.runId)).size).toBe(1);
        if (shape === "array") {
          expect(observer.afterModelCall).toHaveBeenCalledTimes(2);
          expect(observer.afterToolUse).toHaveBeenCalledTimes(1);
          expect(observer.onRunEnd).toHaveBeenCalledTimes(1);
        }
      }
    );
  });

  it("uses the current hooks after the options change", async () => {
    transport.mockImplementation(() => ({ stream: modelStream(false) }));
    const first: RunHooks = { onRunEnd: vi.fn() };
    const second: RunHooks = { onRunEnd: vi.fn() };
    const database = makeDatabase();
    const getToken = async () => "token";
    const { result, rerender } = renderHook(
      ({ hooks }: { hooks?: RunHooks | RunHooks[] }) =>
        useChatStorage({
          database,
          getToken,
          hooks,
          smoothing: false,
        }),
      { initialProps: { hooks: first as RunHooks | RunHooks[] | undefined } }
    );
    const send = async () => {
      await act(async () => {
        const response = await result.current.sendMessage({
          messages,
          model: "test-model",
          apiType: "responses",
          skipStorage: true,
          serverTools: [],
        });
        expect(response.error).toBeNull();
      });
    };

    await send();
    rerender({ hooks: [second] });
    await send();
    rerender({ hooks: undefined });
    await send();

    expect(first.onRunEnd).toHaveBeenCalledTimes(1);
    expect(second.onRunEnd).toHaveBeenCalledTimes(1);
  });
});
