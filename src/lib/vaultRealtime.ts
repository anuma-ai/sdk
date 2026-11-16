export type VaultRealtimeEntity = "private_memories" | "private_memory_topics" | "private_chats";

/** The memory store's entities, for `createRemoteMemoryStore`'s `subscribeChanges`. */
export const vaultMemoryEntities: readonly VaultRealtimeEntity[] = [
  "private_memories",
  "private_memory_topics",
];

/** The chat backend's entities, for `createVaultChatBackend`'s `subscribeChanges`. */
export const vaultChatEntities: readonly VaultRealtimeEntity[] = ["private_chats"];

export interface VaultRealtimeSocket {
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(code?: number, reason?: string): void;
}

export type VaultRealtimeSocketFactory = (url: string, protocols: string[]) => VaultRealtimeSocket;

export interface VaultRealtimeOptions {
  /** Vault's own origin, such as `https://vault.anuma.ai`; the socket is not served on hosts that only share vault's `/api/private-*` routes. */
  baseUrl: string;
  getToken: () => Promise<string | null>;
  fetch?: typeof fetch;
  /** Opens the socket; defaults to the global `WebSocket`. */
  socket?: VaultRealtimeSocketFactory;
  /** Closes the socket while inactive and reconnects at once when active again. */
  activity?: { isActive(): boolean; subscribe(onChange: () => void): () => void };
  retry?: { minMs?: number; maxMs?: number };
  /** Reconnects when nothing arrives for this long; vault sends a ping every 25 s. */
  silenceMs?: number;
}

/** One account's vault realtime socket, shared by its memory store and chat backend. */
export interface VaultRealtime {
  /** A `subscribeChanges` for the given entities: reports the connection state on subscribe and on every connect and disconnect, and `true` on each marker for one of them. */
  changes(
    entities: readonly VaultRealtimeEntity[]
  ): (onChange: (connected: boolean) => void) => () => void;
  close(): void;
}

const subprotocol = "vault.realtime.v1";
const ticketPrefix = "vault.realtime.ticket.";

interface Listener {
  entities: ReadonlySet<string>;
  onChange: (connected: boolean) => void;
}

function defaultSocket(url: string, protocols: string[]): VaultRealtimeSocket {
  const Socket = (globalThis as { WebSocket?: new (u: string, p: string[]) => VaultRealtimeSocket })
    .WebSocket;
  if (!Socket) throw new Error("WebSocket is not available");
  return new Socket(url, protocols);
}

/** Creates one account's vault realtime socket; build a new one after a wallet or token change. */
export function createVaultRealtime(options: VaultRealtimeOptions): VaultRealtime {
  const base = options.baseUrl.replace(/\/+$/, "");
  const socketUrl = `${base.replace(/^http/, "ws")}/api/realtime`;
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const open = options.socket ?? defaultSocket;
  const minMs = options.retry?.minMs ?? 1_000;
  const maxMs = options.retry?.maxMs ?? 60_000;
  const silenceMs = options.silenceMs ?? 60_000;
  const listeners = new Set<Listener>();
  let socket: VaultRealtimeSocket | undefined;
  let ready = false;
  let closed = false;
  let generation = 0;
  let connecting = -1;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;

  const active = () => options.activity?.isActive() ?? true;
  const wanted = () => !closed && listeners.size > 0 && active();

  const notify = (connected: boolean, entity?: string) => {
    for (const listener of [...listeners])
      if (entity === undefined || listener.entities.has(entity)) listener.onChange(connected);
  };

  const lost = () => {
    clearTimeout(silenceTimer);
    if (!ready) return;
    ready = false;
    notify(false);
  };

  const scheduleRetry = (floorMs = 0) => {
    if (!wanted() || retryTimer) return;
    const backoff = Math.min(maxMs, minMs * 2 ** attempt);
    attempt++;
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined;
        void connect();
      },
      Math.max(floorMs, backoff * (0.5 + Math.random() / 2))
    );
  };

  const drop = (ws: VaultRealtimeSocket) => {
    if (socket !== ws) return;
    socket = undefined;
    ws.close();
    lost();
    scheduleRetry();
  };

  const listen = (ws: VaultRealtimeSocket) => {
    const quiet = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => drop(ws), silenceMs);
    };
    quiet();
    ws.onmessage = (event) => {
      if (socket !== ws) return;
      quiet();
      let frame: { type?: unknown; entity?: unknown };
      try {
        frame = JSON.parse(String(event.data)) as typeof frame;
      } catch {
        return;
      }
      if (frame.type === "ready") {
        ready = true;
        attempt = 0;
        notify(true);
      } else if (ready && frame.type === "entity" && typeof frame.entity === "string") {
        notify(true, frame.entity);
      }
    };
    ws.onclose = () => drop(ws);
    ws.onerror = () => drop(ws);
  };

  const connect = async () => {
    if (!wanted() || socket || connecting === generation) return;
    const current = generation;
    connecting = current;
    let floorMs = 0;
    try {
      const token = await options.getToken();
      if (!token) throw new Error("No token for the vault realtime ticket");
      const response = await doFetch(`${base}/api/realtime/ticket`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) floorMs = maxMs;
      if (!response.ok) throw new Error(`Vault realtime ticket: ${response.status}`);
      const { ticket } = (await response.json()) as { ticket?: unknown };
      if (typeof ticket !== "string" || !ticket) throw new Error("Vault realtime ticket missing");
      if (current !== generation || !wanted()) return;
      socket = open(socketUrl, [subprotocol, ticketPrefix + ticket]);
      listen(socket);
    } catch {
      if (current === generation) scheduleRetry(floorMs);
    } finally {
      if (connecting === current) connecting = -1;
    }
  };

  const disconnect = () => {
    generation++;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    const ws = socket;
    socket = undefined;
    ws?.close(1000);
    lost();
  };

  const unsubscribeActivity = options.activity?.subscribe(() => {
    if (!active()) {
      disconnect();
      return;
    }
    attempt = 0;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    void connect();
  });

  return {
    changes: (entities) => (onChange) => {
      const listener: Listener = { entities: new Set(entities), onChange };
      listeners.add(listener);
      onChange(ready);
      void connect();
      return () => {
        if (!listeners.delete(listener) || listeners.size > 0) return;
        disconnect();
      };
    },
    close() {
      closed = true;
      unsubscribeActivity?.();
      disconnect();
      listeners.clear();
    },
  };
}
