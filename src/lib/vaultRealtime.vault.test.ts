import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { conformance, createChatStoreHarness } from "../../test/chat/vaultHarness";
import { createVaultRealtime, vaultChatEntities } from "./vaultRealtime";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

describe.runIf(conformance)("vault realtime against a real vault", () => {
  it("reports connected on ready and a private_chats marker after another device writes", async () => {
    const fake = await createChatStoreHarness();
    const realtime = createVaultRealtime({
      baseUrl: fake.vault!.baseUrl,
      getToken: () => fake.vault!.getToken(),
    });
    const reports: boolean[] = [];
    const stop = realtime.changes(vaultChatEntities)((connected) => reports.push(connected));
    try {
      await vi.waitFor(() => expect(reports).toContain(true), { timeout: 10_000, interval: 20 });
      const before = reports.length;
      await fake.write([
        {
          record: {
            kind: "conversation",
            id: "conv_realtime",
            conversationId: "",
            sortKey: 0,
            createdAt: 1,
            updatedAt: 1,
            isDeleted: false,
            data: { title: "Realtime" },
          },
          expectedVersion: 0,
        },
      ]);
      await vi.waitFor(() => expect(reports.length).toBeGreaterThan(before), {
        timeout: 10_000,
        interval: 20,
      });
      expect(reports.at(-1)).toBe(true);
    } finally {
      stop();
      realtime.close();
    }
  });
});
