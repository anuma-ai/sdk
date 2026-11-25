import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import * as inboxModule from "../lib/chat/inbox";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";

afterEach(() => {
  vi.restoreAllMocks();
});

it.each([
  ["React", useReactChatStorage],
  ["Expo", useExpoChatStorage],
] as const)("passes an undefined wallet address from the %s hook", async (_, useChatStorage) => {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `inbox-${crypto.randomUUID()}`,
  });
  const database = new Database({ adapter, modelClasses: sdkModelClasses });
  const opener = vi.spyOn(inboxModule, "openInboxSealedText");
  const { result } = renderHook(() => useChatStorage({ database }));

  await expect(result.current.openSealedWithInboxKey("{}", "seal-id")).rejects.toThrow(
    "No inbox key"
  );
  expect(opener).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ walletAddress: undefined }),
    "{}",
    "seal-id"
  );
});
