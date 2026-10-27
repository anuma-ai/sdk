import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import type { ChatBackend } from "../storage/ChatBackend";
import { localChatBackend } from "../storage/WatermelonChatStorageAdapter";
import {
  type ChatStoreHarness,
  conformance,
  createChatStoreHarness,
} from "../../../test/chat/vaultHarness";
import { ChatStoreError } from "./types";
import { observeAll } from "../../../test/chat/chatObservation";
import { createVaultChatBackend, type VaultChatBackend } from "./vaultBackend";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `vault-parity-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function vault(fake: ChatStoreHarness): VaultChatBackend {
  return createVaultChatBackend({
    store: fake.store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
  });
}

function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const faults = [
  { make: () => new TypeError("connection reset"), canApply: true },
  { make: () => new ChatStoreError("upstream", 502), canApply: true },
  { make: () => new ChatStoreError("timed out", 408, "timeout"), canApply: true },
  { make: () => new ChatStoreError("busy", 429, "rate_limited", 0), canApply: false },
  { make: () => new ChatStoreError("stale", 409, "version_conflict"), canApply: false },
];

async function settle(b: VaultChatBackend) {
  const deadline = Date.now() + 60_000;
  while (b.status().pending > 0 && Date.now() < deadline) {
    await b.flush();
    if (b.status().pending > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(b.status()).toEqual({ pending: 0 });
}

async function session(seed: number) {
  const next = random(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
  const trace: string[] = [];
  const local = new Proxy(localChatBackend(makeDatabase())({}), {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== "function" || String(property).startsWith("get")) return value;
      return (...args: unknown[]) => {
        trace.push(`${String(property)} ${JSON.stringify(args)}`);
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  const fake = await createChatStoreHarness();
  const remote = vault(fake);
  const live: string[] = [];
  const deleted: string[] = [];
  const messages = new Map<string, string[]>();
  let counter = 0;
  const both = async <T>(op: (b: ChatBackend) => Promise<T>) => {
    const [a, b] = [await op(local), await op(remote)];
    return [a, b] as const;
  };

  for (let step = 0; step < 60; step++) {
    if (next() < 0.25) {
      const fault = pick(faults);
      fake.fail({ op: "putMany", error: fault.make(), after: fault.canApply && next() < 0.5 });
    }
    if (next() < 0.1) fake.fail({ op: "getMany", error: new TypeError("connection reset") });
    if (next() < 0.3) await remote.flush();
    const roll = next();
    const conversation = live.length ? pick(live) : undefined;
    const thread = conversation ? (messages.get(conversation) ?? []) : [];
    if (!conversation || roll < 0.12) {
      const id = `conv_${counter++}`;
      await both((b) => b.createConversation({ conversationId: id, title: `Chat ${id}` }));
      live.push(id);
      messages.set(id, []);
    } else if (roll < 0.4) {
      const id = `msg_${counter++}`;
      const role = thread.length % 2 ? "assistant" : "user";
      const tools = role === "assistant" && next() < 0.3;
      await both((b) =>
        b.createMessage({
          conversationId: conversation,
          role,
          content: `${role} says ${id}`,
          uniqueId: id,
          ...(thread.length ? { parentMessageId: thread[thread.length - 1] } : {}),
          ...(tools ? { toolCallEvents: [{ id: `call_${id}`, name: "search" }] } : {}),
        })
      );
      thread.push(id);
    } else if (roll < 0.46 && thread.length) {
      const id = pick(thread);
      await both((b) =>
        b.upsertMessage({
          conversationId: conversation,
          role: "assistant",
          content: `resumed ${id}`,
          uniqueId: id,
          wasStopped: false,
        })
      );
    } else if (roll < 0.52) {
      await both((b) => b.updateConversationTitle(conversation, `Renamed ${step}`));
    } else if (roll < 0.57) {
      const pinned = next() < 0.5;
      await both((b) => b.updateConversationPinned(conversation, pinned));
    } else if (roll < 0.63 && thread.length) {
      const id = pick(thread);
      const feedback = pick(["like", "dislike"] as const);
      await both((b) => b.updateMessageFeedback(id, feedback));
    } else if (roll < 0.67 && thread.length) {
      const id = pick(thread);
      await both((b) => b.updateMessageError(id, `error ${step}`));
    } else if (roll < 0.7 && thread.length) {
      const id = pick(thread);
      await both((b) => b.updateMessageFileIds!(id, [`media_${step}`]));
    } else if (roll < 0.74 && thread.length) {
      const id = pick(thread);
      const [a, b] = await both((x) => x.deleteMessage(id));
      expect(b).toBe(a);
      thread.splice(thread.indexOf(id), 1);
    } else if (roll < 0.77) {
      await both((b) => b.clearMessages(conversation));
      thread.length = 0;
    } else if (roll < 0.84) {
      const upTo = thread[thread.length - 1] ?? "none";
      await both((b) => b.upsertSummary(conversation, `summary ${step}`, upTo, step));
    } else if (roll < 0.87) {
      await both((b) => b.deleteSummary(conversation));
    } else if (roll < 0.94) {
      const items = [0, 1].map(() => ({ memoryId: `mem_${Math.floor(next() * 6)}`, score: 0.5 }));
      await both((b) => b.addMemoryLinks(conversation, items));
    } else if (roll < 0.96) {
      await both((b) => b.clearMemoryLinks(conversation));
    } else {
      const [a, b] = await both((x) => x.deleteConversation(conversation));
      expect(b).toBe(a);
      live.splice(live.indexOf(conversation), 1);
      deleted.push(conversation);
    }
    if (step % 15 === 14)
      expect(await observeAll(remote, [...live, ...deleted]), trace.join("\n")).toEqual(
        await observeAll(local, [...live, ...deleted])
      );
  }

  fake.heal();
  await settle(remote);
  const ids = [...live, ...deleted];
  const expected = await observeAll(local, ids);
  expect(await observeAll(remote, ids), trace.join("\n")).toEqual(expected);
  const otherDevice = vault(fake);
  expect(await observeAll(otherDevice, ids)).toEqual(expected);
  remote.close();
  otherDevice.close();
}

describe("vault chat backend parity with local storage", () => {
  for (const seed of conformance ? [1, 278] : [1, 7, 42, 278, 1234, 99991, 31337, 2026, 8080]) {
    it(
      `matches local storage through a faulty network (seed ${seed})`,
      () => session(seed),
      30_000
    );
  }
});

async function twoDevices(seed: number) {
  const next = random(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
  const fake = await createChatStoreHarness();
  const devices = [vault(fake), vault(fake)];
  const conversations = ["conv_a", "conv_b"];
  await devices[0].createConversation({ conversationId: "conv_a", title: "A" });
  await devices[0].createConversation({ conversationId: "conv_b", title: "B" });
  await devices[0].flush();
  const created: string[] = [];
  const deleted = new Set<string>();

  for (let step = 0; step < 80; step++) {
    const device = pick(devices);
    if (next() < 0.2) {
      const fault = pick(faults);
      fake.fail({ op: "putMany", error: fault.make(), after: fault.canApply && next() < 0.5 });
    }
    if (next() < 0.25) await device.flush();
    if (next() < 0.25) await device.poll();
    const conversation = pick(conversations);
    const roll = next();
    if (roll < 0.45) {
      const id = `msg_${seed}_${step}`;
      await device.createMessage({
        conversationId: conversation,
        role: "user",
        content: id,
        uniqueId: id,
      });
      created.push(id);
    } else if (roll < 0.6) {
      await device.updateConversationTitle(conversation, `title ${step}`);
    } else if (roll < 0.7) {
      await device.updateConversationPinned(conversation, next() < 0.5);
    } else if (roll < 0.8 && created.length) {
      await device.updateMessageFeedback(pick(created), pick(["like", "dislike"] as const));
    } else if (roll < 0.87 && created.length) {
      const id = pick(created);
      if (await device.deleteMessage(id)) deleted.add(id);
    } else if (roll < 0.94) {
      await device.addMemoryLinks(conversation, [{ memoryId: `mem_${step % 5}`, score: 0.5 }]);
    } else {
      await device.upsertSummary(conversation, `summary ${step}`, `msg_${step}`, step);
    }
  }

  fake.heal();
  for (const d of devices) await settle(d);
  for (const d of devices) await d.poll();
  const truth = vault(fake);
  const expected = await observeAll(truth, conversations);
  for (const d of devices) expect(await observeAll(d, conversations)).toEqual(expected);
  const stored = expected.conversations.flatMap((c) => c?.messages.map((m) => m.uniqueId) ?? []);
  expect(stored.sort()).toEqual(created.filter((id) => !deleted.has(id)).sort());
  for (const d of [...devices, truth]) d.close();
}

describe("vault chat backend across two devices", () => {
  for (const seed of conformance ? [3, 278] : [3, 11, 278, 4242, 65537, 777]) {
    it(
      `converges on the server's state with no message lost (seed ${seed})`,
      () => twoDevices(seed),
      30_000
    );
  }
});
