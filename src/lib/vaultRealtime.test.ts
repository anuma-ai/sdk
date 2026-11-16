import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createVaultRealtime,
  vaultChatEntities,
  vaultMemoryEntities,
  type VaultRealtimeOptions,
  type VaultRealtimeSocket,
} from "./vaultRealtime";

class FakeSocket implements VaultRealtimeSocket {
  onmessage: VaultRealtimeSocket["onmessage"] = null;
  onclose: VaultRealtimeSocket["onclose"] = null;
  onerror: VaultRealtimeSocket["onerror"] = null;
  closed = false;
  constructor(
    readonly url: string,
    readonly protocols: string[]
  ) {}
  close() {
    this.closed = true;
  }
  send(frame: unknown) {
    this.onmessage?.({ data: typeof frame === "string" ? frame : JSON.stringify(frame) });
  }
}

function harness(overrides: Partial<VaultRealtimeOptions> = {}) {
  const sockets: FakeSocket[] = [];
  let tickets = 0;
  const statuses: number[] = [];
  const fetch = vi.fn(async () => {
    const status = statuses.shift() ?? 200;
    if (status !== 200) return new Response("{}", { status });
    tickets++;
    return Response.json({ ticket: `t${tickets}`, expires_in: 30 });
  });
  const realtime = createVaultRealtime({
    baseUrl: "https://vault.test/",
    getToken: async () => "jwt",
    fetch: fetch as unknown as typeof globalThis.fetch,
    socket: (url, protocols) => {
      const socket = new FakeSocket(url, protocols);
      sockets.push(socket);
      return socket;
    },
    retry: { minMs: 100, maxMs: 1_000 },
    silenceMs: 5_000,
    ...overrides,
  });
  return { realtime, sockets, fetch, statuses, last: () => sockets.at(-1)! };
}

describe("vault realtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens one socket with a ticket and reports each store's markers to it alone", async () => {
    const { realtime, sockets, fetch, last } = harness();
    const memory = vi.fn();
    const chat = vi.fn();
    realtime.changes(vaultMemoryEntities)(memory);
    realtime.changes(vaultChatEntities)(chat);
    expect(memory.mock.calls).toEqual([[false]]);
    expect(chat.mock.calls).toEqual([[false]]);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://vault.test/api/realtime/ticket", {
      method: "POST",
      headers: { Authorization: "Bearer jwt" },
    });
    expect(sockets).toHaveLength(1);
    expect(last().url).toBe("wss://vault.test/api/realtime");
    expect(last().protocols).toEqual(["vault.realtime.v1", "vault.realtime.ticket.t1"]);

    last().send({ type: "entity", entity: "private_chats", action: "update" });
    expect(chat).toHaveBeenCalledTimes(1);
    last().send({ type: "ready" });
    expect(memory.mock.calls).toEqual([[false], [true]]);
    expect(chat.mock.calls).toEqual([[false], [true]]);

    last().send({ type: "entity", entity: "private_chats", action: "update" });
    last().send({ type: "entity", entity: "private_memory_topics", action: "update" });
    last().send({ type: "entity", entity: "something_else", action: "update" });
    last().send({ type: "ping" });
    last().send("not json");
    expect(chat.mock.calls).toEqual([[false], [true], [true]]);
    expect(memory.mock.calls).toEqual([[false], [true], [true]]);

    const late = vi.fn();
    realtime.changes(vaultChatEntities)(late);
    expect(late.mock.calls).toEqual([[true]]);
    expect(sockets).toHaveLength(1);
  });

  it("reports a drop and reconnects with growing backoff until vault answers", async () => {
    const { realtime, sockets, fetch, statuses, last } = harness();
    const chat = vi.fn();
    realtime.changes(vaultChatEntities)(chat);
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: "ready" });
    chat.mockClear();

    statuses.push(503, 503);
    last().onclose?.({});
    expect(chat.mock.calls).toEqual([[false]]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(400);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sockets).toHaveLength(2);
    last().send({ type: "ready" });
    expect(chat.mock.calls).toEqual([[false], [true]]);

    last().onerror?.({});
    await vi.advanceTimersByTimeAsync(100);
    expect(sockets).toHaveLength(3);
  });

  it("backs off to the ceiling when vault has no realtime endpoint", async () => {
    const { realtime, fetch, statuses } = harness();
    statuses.push(404);
    realtime.changes(vaultMemoryEntities)(vi.fn());
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reconnects when the socket goes silent", async () => {
    const { realtime, sockets, last } = harness();
    const memory = vi.fn();
    realtime.changes(vaultMemoryEntities)(memory);
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: "ready" });
    await vi.advanceTimersByTimeAsync(4_000);
    last().send({ type: "ping" });
    await vi.advanceTimersByTimeAsync(4_999);
    expect(sockets[0]!.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets[0]!.closed).toBe(true);
    expect(memory).toHaveBeenLastCalledWith(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(sockets).toHaveLength(2);
  });

  it("closes while the app is inactive and reconnects at once when it returns", async () => {
    let active = true;
    let changed = () => {};
    const { realtime, sockets, last } = harness({
      activity: {
        isActive: () => active,
        subscribe: (onChange) => {
          changed = onChange;
          return () => {};
        },
      },
    });
    const chat = vi.fn();
    realtime.changes(vaultChatEntities)(chat);
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: "ready" });

    active = false;
    changed();
    expect(sockets[0]!.closed).toBe(true);
    expect(chat).toHaveBeenLastCalledWith(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sockets).toHaveLength(1);

    active = true;
    changed();
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets).toHaveLength(2);
  });

  it("closes the socket when the last store stops listening, and for good on close", async () => {
    const { realtime, sockets, fetch, last } = harness();
    const stopMemory = realtime.changes(vaultMemoryEntities)(vi.fn());
    const stopChat = realtime.changes(vaultChatEntities)(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: "ready" });
    stopMemory();
    expect(sockets[0]!.closed).toBe(false);
    stopChat();
    expect(sockets[0]!.closed).toBe(true);

    const chat = vi.fn();
    realtime.changes(vaultChatEntities)(chat);
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets).toHaveLength(2);
    realtime.close();
    expect(sockets[1]!.closed).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);
  });

  it("drops a ticket that arrives after its listeners left", async () => {
    let answer: (response: Response) => void = () => {};
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)));
    const { realtime, sockets } = harness({ fetch: fetch as unknown as typeof globalThis.fetch });
    const stop = realtime.changes(vaultChatEntities)(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    stop();
    answer(Response.json({ ticket: "late" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets).toHaveLength(0);
  });
});
