// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./useChat", () => ({
  useChat: vi.fn(() => ({
    isLoading: false,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    detach: vi.fn(),
    resumeStream: vi.fn(),
  })),
}));

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { StreamSmoothingConfig } from "./index";
import { useChat } from "./useChat";
import { useChatStorage } from "./useChatStorage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("storage stream pacing", () => {
  it("returns client-tool results without writing private chat history", async () => {
    const database = new Database({
      adapter: new LokiJSAdapter({
        schema: sdkSchema,
        migrations: sdkMigrations,
        useWebWorker: false,
        useIncrementalIndexedDB: false,
        dbName: `shared-output-${Math.random()}`,
      }),
      modelClasses: sdkModelClasses,
    });
    const toolResults = [{ name: "display_weather", result: { location: "San Francisco" } }];
    const send = vi.fn().mockResolvedValue({
      data: { output: [] },
      error: null,
      autoExecutedToolResults: toolResults,
    });
    vi.mocked(useChat).mockReturnValue({ isLoading: false, sendMessage: send, stop: vi.fn() });
    const { result } = renderHook(() =>
      useChatStorage({ database, autoCreateConversation: false })
    );
    let output: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      output = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        model: "auto",
        skipStorage: true,
        serverTools: [],
      });
    });
    expect(output).toMatchObject({ skipped: true, autoExecutedToolResults: toolResults });
    expect(await database.get("history").query().fetchCount()).toBe(0);
    expect(await database.get("conversations").query().fetchCount()).toBe(0);
  });

  it.each([undefined, false, true, { enabled: true, maxSpeed: 1200 }] as const)(
    "forwards %j without overriding the underlying default",
    (smoothing) => {
      const database = new Database({
        adapter: new LokiJSAdapter({
          schema: sdkSchema,
          migrations: sdkMigrations,
          useWebWorker: false,
          useIncrementalIndexedDB: false,
          dbName: `stream-pacing-${Math.random()}`,
        }),
        modelClasses: sdkModelClasses,
      });
      const onStreamMeta = vi.fn();
      const { rerender } = renderHook(
        ({ pacing }: { pacing: boolean | StreamSmoothingConfig | undefined }) =>
          useChatStorage({
            database,
            autoCreateConversation: false,
            smoothing: pacing,
            resumable: true,
            onStreamMeta,
          }),
        { initialProps: { pacing: smoothing as boolean | StreamSmoothingConfig | undefined } }
      );
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.smoothing).toBe(smoothing);
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.resumable).toBe(true);
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.onStreamMeta).toBe(onStreamMeta);
      rerender({ pacing: false });
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.smoothing).toBe(false);
    }
  );
});
