// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type AppCompleteBridge,
  type AppCompleteBridgeOptions,
  APP_COMPLETE_CONNECT_ACK_TYPE,
  APP_COMPLETE_CONNECT_TYPE,
  APP_COMPLETE_DEFAULT_TIMEOUT_MS,
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_REQUEST_TYPE,
  APP_COMPLETE_RESPONSE_TYPE,
  createAppCompleteBridge,
  installAppCompleteIframeShim,
} from "./appCompleteBridge.js";

const bridges: AppCompleteBridge[] = [];
function mkBridge(opts: AppCompleteBridgeOptions): AppCompleteBridge {
  const bridge = createAppCompleteBridge(opts);
  bridges.push(bridge);
  return bridge;
}
afterEach(() => {
  for (const bridge of bridges) bridge.dispose();
  bridges.length = 0;
});

interface ConnectAck {
  ackMessage: { type?: string; id?: string };
  replyOrigin: string;
  port: MessagePort;
}

function dispatchConnect(opts: {
  origin: string;
  spy: ReturnType<typeof vi.fn>;
  id?: string;
}): void {
  const source = { postMessage: opts.spy } as unknown as Window;
  const event = new MessageEvent("message", {
    data: { type: APP_COMPLETE_CONNECT_TYPE, id: opts.id ?? "conn-1" },
    origin: opts.origin,
    source,
  });
  window.dispatchEvent(event);
}

function connect(opts: { origin: string; id?: string }): ConnectAck {
  const spy = vi.fn();
  dispatchConnect({ origin: opts.origin, spy, id: opts.id });
  expect(spy.mock.calls.length).toBe(1);
  const [ackMessage, replyOrigin, transfer] = spy.mock.calls[0] as [
    { type?: string; id?: string },
    string,
    MessagePort[],
  ];
  return { ackMessage, replyOrigin, port: transfer[0] };
}

function requestOverPort(
  port: MessagePort,
  req: { id: string; prompt: string }
): Promise<{ type?: string; id?: string; result?: string; error?: string }> {
  return new Promise((resolve) => {
    port.onmessage = (e: MessageEvent): void => resolve(e.data);
    port.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: req.id, prompt: req.prompt });
  });
}

describe("createAppCompleteBridge connect handshake", () => {
  it("acks a connect with a transferred MessagePort", () => {
    mkBridge({
      complete: vi.fn(async (p: string) => p),
      allowedOrigins: ["https://child.example"],
    });

    const { ackMessage, port } = connect({ origin: "https://child.example", id: "h1" });
    expect(ackMessage).toMatchObject({ type: APP_COMPLETE_CONNECT_ACK_TYPE, id: "h1" });
    expect(typeof port.postMessage).toBe("function");
  });

  it("serves a request over the port with the result", async () => {
    const complete = vi.fn(async (p: string) => `echo: ${p}`);
    mkBridge({ complete, allowedOrigins: ["https://child.example"] });

    const { port } = connect({ origin: "https://child.example" });
    const res = await requestOverPort(port, { id: "abc", prompt: "hi" });

    expect(res).toMatchObject({ type: APP_COMPLETE_RESPONSE_TYPE, id: "abc", result: "echo: hi" });
    expect(complete).toHaveBeenCalledWith("hi");
  });

  it("forwards thrown errors as response.error strings over the port", async () => {
    const complete = vi.fn(async () => {
      throw new Error("boom");
    });
    mkBridge({ complete, allowedOrigins: ["https://child.example"] });

    const { port } = connect({ origin: "https://child.example" });
    const res = await requestOverPort(port, { id: "x", prompt: "trigger" });

    expect(res).toMatchObject({ type: APP_COMPLETE_RESPONSE_TYPE, id: "x", error: "boom" });
  });

  it("ignores port messages without the request type", async () => {
    const complete = vi.fn(async () => "nope");
    mkBridge({ complete, allowedOrigins: ["https://child.example"] });

    const { port } = connect({ origin: "https://child.example" });
    port.onmessage = vi.fn();
    port.postMessage({ type: "something:else", id: "y", prompt: "p" });
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
  });

  it("ignores port requests without a string id", async () => {
    const complete = vi.fn(async () => "nope");
    mkBridge({ complete, allowedOrigins: ["https://child.example"] });

    const { port } = connect({ origin: "https://child.example" });
    port.onmessage = vi.fn();
    port.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: 123, prompt: "p" });
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
  });

  it("ignores connect messages without the connect type", () => {
    mkBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    const source = { postMessage: spy } as unknown as Window;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "something:else", id: "z" },
        origin: "https://child.example",
        source,
      })
    );
    expect(spy.mock.calls.length).toBe(0);
  });

  it("ignores connects without a string id", () => {
    mkBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    const source = { postMessage: spy } as unknown as Window;
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: APP_COMPLETE_CONNECT_TYPE, id: 123 },
        origin: "https://child.example",
        source,
      })
    );
    expect(spy.mock.calls.length).toBe(0);
  });

  it("drops connects whose origin is not in allowedOrigins", () => {
    mkBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://only-this-origin.example"],
    });

    const spy = vi.fn();
    dispatchConnect({ origin: "https://someone-else.example", spy });
    expect(spy.mock.calls.length).toBe(0);
  });

  it("dispose removes the listener so later connects are ignored", () => {
    const bridge = mkBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://child.example"],
    });
    bridge.dispose();

    const spy = vi.fn();
    dispatchConnect({ origin: "https://child.example", spy });
    expect(spy.mock.calls.length).toBe(0);
  });

  it("answers a given (source, id) once — the shim's retries don't mint extra channels", () => {
    mkBridge({
      complete: vi.fn(async (p: string) => p),
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    const source = { postMessage: spy } as unknown as Window;
    const fire = (): void => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: APP_COMPLETE_CONNECT_TYPE, id: "retry-1" },
          origin: "https://child.example",
          source,
        })
      );
    };
    fire();
    fire();
    fire();
    expect(spy.mock.calls.length).toBe(1);
  });
});

describe("createAppCompleteBridge ack targeting", () => {
  it("targets the ack at the requester's own origin by default", () => {
    mkBridge({
      complete: vi.fn(async (p: string) => p),
      allowedOrigins: ["https://child.example"],
    });

    const { replyOrigin } = connect({ origin: "https://child.example" });
    expect(replyOrigin).toBe("https://child.example");
    expect(replyOrigin).not.toBe("*");
  });

  it('falls back to "*" for an opaque ("null") origin', () => {
    mkBridge({
      complete: vi.fn(async (p: string) => p),
      allowedOrigins: ["null"],
    });

    const { replyOrigin } = connect({ origin: "null" });
    expect(replyOrigin).toBe("*");
  });

  it("uses an explicit targetOrigin over the requester's origin", () => {
    mkBridge({
      complete: vi.fn(async (p: string) => p),
      targetOrigin: "https://pin.example",
      allowedOrigins: ["https://child.example"],
    });

    const { replyOrigin } = connect({ origin: "https://child.example" });
    expect(replyOrigin).toBe("https://pin.example");
  });
});

describe("createAppCompleteBridge default-deny", () => {
  it("throws when neither allowedOrigins nor source is set", () => {
    expect(() => createAppCompleteBridge({ complete: vi.fn(async () => "x") })).toThrow(
      /refusing a wide-open bridge/
    );
  });

  it("does not throw or warn when allowedOrigins is set", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = mkBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://x.example"],
    });
    expect(bridge).toBeDefined();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not throw or warn when source is set", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = mkBridge({
      complete: vi.fn(async () => "x"),
      source: window,
    });
    expect(bridge).toBeDefined();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('accepts every origin with the explicit ["*"] wildcard', () => {
    mkBridge({ complete: vi.fn(async (p: string) => p), allowedOrigins: ["*"] });
    const { port } = connect({ origin: "https://anything.example" });
    expect(typeof port.postMessage).toBe("function");
  });

  it('warns exactly once for the explicit ["*"] wildcard (fresh module)', async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("./appCompleteBridge.js");

    const b1 = mod.createAppCompleteBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["*"],
    });
    const b2 = mod.createAppCompleteBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["*"],
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("[anuma] createAppCompleteBridge");

    b1.dispose();
    b2.dispose();
    warnSpy.mockRestore();
  });
});

describe("APP_COMPLETE_IFRAME_SHIM_SCRIPT", () => {
  it("does nothing when there is no parent window", () => {
    const before = (window as unknown as { app?: unknown }).app;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(APP_COMPLETE_IFRAME_SHIM_SCRIPT)();
    expect((window as unknown as { app?: unknown }).app).toBe(before);
  });

  it("is the same payload as installAppCompleteIframeShim runs", () => {
    expect(installAppCompleteIframeShim.toString()).toContain("APP_COMPLETE_IFRAME_SHIM_SCRIPT");
  });

  it("references all four protocol message types", () => {
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(JSON.stringify(APP_COMPLETE_CONNECT_TYPE));
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(
      JSON.stringify(APP_COMPLETE_CONNECT_ACK_TYPE)
    );
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(JSON.stringify(APP_COMPLETE_REQUEST_TYPE));
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(JSON.stringify(APP_COMPLETE_RESPONSE_TYPE));
  });

  it("exports a sane default timeout constant baked into the shim", () => {
    expect(APP_COMPLETE_DEFAULT_TIMEOUT_MS).toBeGreaterThan(1_000);
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(String(APP_COMPLETE_DEFAULT_TIMEOUT_MS));
  });
});

interface IframeAppWindow {
  eval: (src: string) => unknown;
  app?: { complete?: (p: string) => Promise<string> };
  APP_COMPLETE_TIMEOUT_MS?: number;
  APP_COMPLETE_PARENT_ORIGIN?: string;
}

async function mountIframeWithShim(opts?: {
  timeoutMs?: number;
  parentOrigin?: string;
}): Promise<{ iframe: HTMLIFrameElement; iw: IframeAppWindow }> {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  await new Promise((r) => setTimeout(r, 10));
  const iw = iframe.contentWindow as unknown as IframeAppWindow;
  if (opts?.timeoutMs !== undefined) iw.APP_COMPLETE_TIMEOUT_MS = opts.timeoutMs;
  if (opts?.parentOrigin !== undefined) iw.APP_COMPLETE_PARENT_ORIGIN = opts.parentOrigin;
  iw.eval(APP_COMPLETE_IFRAME_SHIM_SCRIPT);
  return { iframe, iw };
}

interface ShimRequest {
  type: string;
  id: string;
  prompt: string;
}

type Respond = (
  req: ShimRequest,
  port: MessagePort
) =>
  | { result?: string; error?: string }
  | null
  | Promise<{ result?: string; error?: string } | null>;

function attachIframeResponder(
  iframe: HTMLIFrameElement,
  respond: Respond,
  opts?: { ackOrigin?: string }
): () => void {
  let live = true;
  const channels: MessageChannel[] = [];
  const onConnect = (event: MessageEvent): void => {
    if (!live) return;
    const data = event.data as { type?: unknown; id?: unknown };
    if (data?.type !== APP_COMPLETE_CONNECT_TYPE || typeof data.id !== "string") return;

    const channel = new MessageChannel();
    channels.push(channel);
    channel.port1.onmessage = async (ev: MessageEvent): Promise<void> => {
      if (!live) return;
      const rd = ev.data as { type?: unknown; id?: unknown; prompt?: unknown };
      if (rd?.type !== APP_COMPLETE_REQUEST_TYPE || typeof rd.id !== "string") return;
      const req: ShimRequest = {
        type: rd.type as string,
        id: rd.id,
        prompt: String(rd.prompt ?? ""),
      };
      const out = await respond(req, channel.port1);
      if (out && live) {
        channel.port1.postMessage({ type: APP_COMPLETE_RESPONSE_TYPE, id: req.id, ...out });
      }
    };

    const ackEvent = new MessageEvent("message", {
      data: { type: APP_COMPLETE_CONNECT_ACK_TYPE, id: data.id },
      origin: opts?.ackOrigin ?? "",
      ports: [channel.port2],
    });
    (iframe.contentWindow as unknown as EventTarget).dispatchEvent(ackEvent);
  };
  window.addEventListener("message", onConnect);
  return (): void => {
    live = false;
    window.removeEventListener("message", onConnect);
    for (const ch of channels) {
      try {
        ch.port1.close();
      } catch {
        /* already closed */
      }
    }
  };
}

describe("appCompleteBridge round-trip (iframe shim ↔ parent)", () => {
  it("resolves window.app.complete with the response result", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, (req) => ({ result: `echo:${req.prompt}` }));

    const result = await iw.app!.complete!("hi from iframe");
    expect(result).toBe("echo:hi from iframe");

    detach();
    document.body.removeChild(iframe);
  });

  it("rejects with the response error message", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, () => ({ error: "upstream failure" }));

    await expect(iw.app!.complete!("anything")).rejects.toThrow("upstream failure");

    detach();
    document.body.removeChild(iframe);
  });

  it("reuses a single channel across calls and correlates by id (no cross-talk)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    let counter = 0;
    const ports = new Set<MessagePort>();
    const detach = attachIframeResponder(iframe, async (req, port) => {
      ports.add(port);
      const n = ++counter;
      await new Promise((r) => setTimeout(r, req.prompt.length));
      return { result: `${req.prompt}#${n}` };
    });

    const [a, b, c] = await Promise.all([
      iw.app!.complete!("short"),
      iw.app!.complete!("medium-length"),
      iw.app!.complete!("a-much-longer-prompt-string"),
    ]);

    expect(a.startsWith("short#")).toBe(true);
    expect(b.startsWith("medium-length#")).toBe(true);
    expect(c.startsWith("a-much-longer-prompt-string#")).toBe(true);
    expect(ports.size).toBe(1);

    detach();
    document.body.removeChild(iframe);
  });

  it("ignores port responses with a non-matching id", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, async (req, port) => {
      port.postMessage({ type: APP_COMPLETE_RESPONSE_TYPE, id: "not-the-id", result: "WRONG" });
      await new Promise((r) => setTimeout(r, 5));
      return { result: `right:${req.prompt}` };
    });

    const result = await iw.app!.complete!("p");
    expect(result).toBe("right:p");

    detach();
    document.body.removeChild(iframe);
  });

  it("ignores port messages without the response type", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, async (req, port) => {
      port.postMessage({ type: "something:else", id: req.id, result: "WRONG" });
      await new Promise((r) => setTimeout(r, 5));
      return { result: `right:${req.prompt}` };
    });

    const result = await iw.app!.complete!("p");
    expect(result).toBe("right:p");

    detach();
    document.body.removeChild(iframe);
  });

  it("rejects with a timeout error when no bridge ever answers the connect", async () => {
    const { iframe, iw } = await mountIframeWithShim({ timeoutMs: 30 });
    await expect(iw.app!.complete!("hi")).rejects.toThrow(/timed out after 30ms/);
    document.body.removeChild(iframe);
  });

  it("connects to a bridge that mounts after the first announcement (keeps retrying)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const pending = iw.app!.complete!("late");
    await new Promise((r) => setTimeout(r, 450));
    const detach = attachIframeResponder(iframe, (req) => ({ result: `ok:${req.prompt}` }));

    await expect(pending).resolves.toBe("ok:late");

    detach();
    document.body.removeChild(iframe);
  });

  it("re-handshakes for a fresh call after the cached channel goes dead", async () => {
    const { iframe, iw } = await mountIframeWithShim({ timeoutMs: 120 });
    const detach1 = attachIframeResponder(iframe, (req) => ({ result: `one:${req.prompt}` }));
    expect(await iw.app!.complete!("a")).toBe("one:a");

    detach1();
    await expect(iw.app!.complete!("b")).rejects.toThrow(/timed out/);

    const detach2 = attachIframeResponder(iframe, (req) => ({ result: `two:${req.prompt}` }));
    expect(await iw.app!.complete!("c")).toBe("two:c");

    detach2();
    document.body.removeChild(iframe);
  });

  it("never broadcasts the prompt up the frame tree (only a content-free connect)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, (req) => ({ result: `ok:${req.prompt}` }));

    const seen: unknown[] = [];
    const spy = (e: MessageEvent): void => {
      seen.push(e.data);
    };
    window.addEventListener("message", spy);

    const secret = "TOP-SECRET-PROMPT-9173";
    const result = await iw.app!.complete!(secret);
    expect(result).toBe(`ok:${secret}`);
    await new Promise((r) => setTimeout(r, 10));
    window.removeEventListener("message", spy);

    expect(seen.length).toBeGreaterThan(0);
    for (const data of seen) {
      const d = data as { type?: string; prompt?: unknown };
      expect(d.type).toBe(APP_COMPLETE_CONNECT_TYPE);
      expect("prompt" in (d as object)).toBe(false);
    }
    const serialized = JSON.stringify(seen);
    expect(serialized).not.toContain(secret);

    detach();
    document.body.removeChild(iframe);
  });
});

describe("appCompleteBridge APP_COMPLETE_PARENT_ORIGIN guard", () => {
  it("connects when the ack origin matches the expected parent origin", async () => {
    const { iframe, iw } = await mountIframeWithShim({
      parentOrigin: "https://host.example",
    });
    const detach = attachIframeResponder(iframe, (req) => ({ result: `ok:${req.prompt}` }), {
      ackOrigin: "https://host.example",
    });

    const result = await iw.app!.complete!("p");
    expect(result).toBe("ok:p");

    detach();
    document.body.removeChild(iframe);
  });

  it("ignores an ack from a non-matching origin (forged-ack defense)", async () => {
    const { iframe, iw } = await mountIframeWithShim({
      parentOrigin: "https://host.example",
      timeoutMs: 60,
    });
    const detach = attachIframeResponder(iframe, (req) => ({ result: `evil:${req.prompt}` }), {
      ackOrigin: "https://evil.example",
    });

    await expect(iw.app!.complete!("p")).rejects.toThrow(/timed out/);

    detach();
    document.body.removeChild(iframe);
  });
});
