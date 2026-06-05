// @vitest-environment happy-dom
/**
 * Tests for the parent ↔ iframe bridge for window.app.complete.
 *
 * happy-dom is enough for postMessage + addEventListener + same-realm
 * MessageChannel; the bridge doesn't touch React, the DOM, or layout.
 *
 * Two happy-dom quirks shape these tests:
 *  - postMessage drops its transfer list (event.ports is empty after a
 *    cross-window post), so we deliver ports either by reading the
 *    transfer argument off a postMessage spy (bridge-side tests) or by
 *    dispatching a synthetic MessageEvent whose `ports` we set
 *    (round-trip tests). A real browser (Playwright) exercises the true
 *    cross-window transfer — see appCompleteBridge.browser.test.ts.
 *  - event.source.postMessage(...) isn't routed back to an iframe, so the
 *    round-trip tests stand in a custom responder for the real bridge.
 */

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

// Track bridges so afterEach always tears them down — even when a test throws
// mid-way. A leaked bridge keeps a window "message" listener alive, which would
// answer the next test's connect and skew spy call counts. (happy-dom also
// stack-overflows when vitest pretty-prints a MessagePort, so the helpers below
// assert on numeric call counts / shapes, never on a port object directly.)
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

// ─────────────────────────────────────────────────────────────────────────
// Bridge side: connect handshake + per-port request serving.
//
// A connect announcement is dispatched with a `source` whose postMessage is a
// spy, so we can read the connect-ack message, its targetOrigin, and the
// transferred MessagePort. Driving that port (same realm) exercises the real
// request → complete() → response path.
// ─────────────────────────────────────────────────────────────────────────

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

/** Dispatch a connect and pull the ack + transferred port out of the spy. */
function connect(opts: { origin: string; id?: string }): ConnectAck {
  const spy = vi.fn();
  dispatchConnect({ origin: opts.origin, spy, id: opts.id });
  // Numeric check — never `expect(spy).toHaveBeenCalledTimes`, whose failure
  // printer would recurse into the MessagePort arg and stack-overflow.
  expect(spy.mock.calls.length).toBe(1);
  const [ackMessage, replyOrigin, transfer] = spy.mock.calls[0] as [
    { type?: string; id?: string },
    string,
    MessagePort[],
  ];
  return { ackMessage, replyOrigin, port: transfer[0] };
}

/** Send a request over the iframe-side port and resolve with the response. */
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
    // Shape check, not `toBeInstanceOf` — a failing instanceof would print the
    // port and stack-overflow happy-dom's serializer.
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

    // Same source window + same connect id, three times (mimicking the shim's
    // re-announce loop). The bridge must ack exactly once.
    const spy = vi.fn();
    const source = { postMessage: spy } as unknown as Window;
    const fire = (): void =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: APP_COMPLETE_CONNECT_TYPE, id: "retry-1" },
          origin: "https://child.example",
          source,
        })
      );
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
    // The fix: ack origin (which carries the port) is the requester's, NOT "*".
    expect(replyOrigin).toBe("https://child.example");
    expect(replyOrigin).not.toBe("*");
  });

  it('falls back to "*" for an opaque ("null") origin', () => {
    // Sandboxed/srcdoc iframes serialize their origin to "null", which can't
    // be used as a postMessage targetOrigin; the bridge falls back to "*".
    // The ack still reaches only event.source, so no broadcast leak.
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
    // A connect from an arbitrary origin still gets a port.
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
    // In the test environment, window.parent === window, so the IIFE
    // should bail out early and leave window.app untouched.
    const before = (window as unknown as { app?: unknown }).app;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(APP_COMPLETE_IFRAME_SHIM_SCRIPT)();
    expect((window as unknown as { app?: unknown }).app).toBe(before);
  });

  it("is the same payload as installAppCompleteIframeShim runs", () => {
    expect(installAppCompleteIframeShim.toString()).toContain("APP_COMPLETE_IFRAME_SHIM_SCRIPT");
  });

  it("references all four protocol message types", () => {
    // Compile-time the constants are shared imports; this sentinel fails
    // loudly if someone renames one without re-templating the shim.
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

// ─────────────────────────────────────────────────────────────────────────
// End-to-end iframe-shim round-trip.
//
// We mount a real iframe, install the shim via `contentWindow.eval`, and act
// as the parent: capture the shim's connect announcement, hand back a
// MessagePort (delivered via a synthetic MessageEvent since happy-dom drops
// postMessage transfer lists), then serve requests over that port. This
// catches wire-protocol drift the isolation tests can't.
// ─────────────────────────────────────────────────────────────────────────

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
  // Give happy-dom a tick to finish initialising contentWindow.
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

/**
 * Stand in for the parent bridge: answer the shim's connect with a
 * MessagePort, then serve requests over it. `ackOrigin` sets the synthetic
 * ack event's origin (used to exercise the shim's APP_COMPLETE_PARENT_ORIGIN
 * guard).
 */
function attachIframeResponder(
  iframe: HTMLIFrameElement,
  respond: Respond,
  opts?: { ackOrigin?: string }
): () => void {
  // detach() faithfully simulates a torn-down bridge: it stops answering AND
  // closes the established channels, so a previously-connected shim's next
  // request goes unanswered (the dead-channel path), not just future connects.
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

    // Deliver port2 to the iframe via a synthetic event (transfer lists are
    // dropped by happy-dom's postMessage).
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
      // Resolve out-of-order on purpose: longer prompts come back later.
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
    // All three requests arrived over the same handshake-established port.
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
    // No responder attached → connect is never acked.
    await expect(iw.app!.complete!("hi")).rejects.toThrow(/timed out after 30ms/);
    document.body.removeChild(iframe);
  });

  it("connects to a bridge that mounts after the first announcement (keeps retrying)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    // Start the call with no bridge present, then attach the responder only
    // after the first retry interval (300ms) has elapsed — so the initial
    // announcement is missed and a *retry* must be what finds the bridge.
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

    // Simulate the host bridge being torn down: nobody answers the dead port.
    detach1();
    await expect(iw.app!.complete!("b")).rejects.toThrow(/timed out/);

    // The timeout dropped the dead channel, so a new bridge is picked up via a
    // fresh handshake (new connect id, so the responder re-acks).
    const detach2 = attachIframeResponder(iframe, (req) => ({ result: `two:${req.prompt}` }));
    expect(await iw.app!.complete!("c")).toBe("two:c");

    detach2();
    document.body.removeChild(iframe);
  });

  it("never broadcasts the prompt up the frame tree (only a content-free connect)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, (req) => ({ result: `ok:${req.prompt}` }));

    // Capture every message the parent window receives during a round-trip.
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

    // The parent window only ever saw connect announcements — never a prompt.
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
    // A frame answers with a port but from the wrong origin — the shim must
    // refuse it, so the call times out rather than binding to the impostor.
    const detach = attachIframeResponder(iframe, (req) => ({ result: `evil:${req.prompt}` }), {
      ackOrigin: "https://evil.example",
    });

    await expect(iw.app!.complete!("p")).rejects.toThrow(/timed out/);

    detach();
    document.body.removeChild(iframe);
  });
});
