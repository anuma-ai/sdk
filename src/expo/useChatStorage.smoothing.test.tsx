// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { cleanup, renderHook } from "@testing-library/react";
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
      const { rerender } = renderHook(
        ({ pacing }: { pacing: boolean | StreamSmoothingConfig | undefined }) =>
          useChatStorage({ database, autoCreateConversation: false, smoothing: pacing }),
        { initialProps: { pacing: smoothing as boolean | StreamSmoothingConfig | undefined } }
      );
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.smoothing).toBe(smoothing);
      rerender({ pacing: false });
      expect(vi.mocked(useChat).mock.lastCall?.[0]?.smoothing).toBe(false);
    }
  );
});
