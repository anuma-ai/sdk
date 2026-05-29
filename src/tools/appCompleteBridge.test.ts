// @vitest-environment happy-dom
/**
 * Tests for the parent ↔ iframe bridge for window.app.complete.
 *
 * happy-dom is enough for postMessage + addEventListener; the bridge
 * doesn't touch React, the DOM, or layout.
 */

import { describe, expect, it, vi } from "vitest";

import {
  APP_COMPLETE_DEFAULT_TIMEOUT_MS,
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_REQUEST_TYPE,
  APP_COMPLETE_RESPONSE_TYPE,
  createAppCompleteBridge,
  installAppCompleteIframeShim,
} from "./appCompleteBridge.js";

describe("createAppCompleteBridge", () => {
  it("responds to a valid request with the result", async () => {
    const complete = vi.fn(async (p: string) => `echo: ${p}`);
    const bridge = createAppCompleteBridge({ complete });

    const reply = new Promise<MessageEvent>((resolve) => {
      window.addEventListener("message", (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === APP_COMPLETE_RESPONSE_TYPE) {
          resolve(e);
        }
      });
    });

    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: "abc", prompt: "hi" }, "*");

    const event = await reply;
    expect(event.data).toMatchObject({
      type: APP_COMPLETE_RESPONSE_TYPE,
      id: "abc",
      result: "echo: hi",
    });
    expect(complete).toHaveBeenCalledWith("hi");
    bridge.dispose();
  });

  it("forwards thrown errors as response.error strings", async () => {
    const complete = vi.fn(async () => {
      throw new Error("boom");
    });
    const bridge = createAppCompleteBridge({ complete });

    const reply = new Promise<MessageEvent>((resolve) => {
      window.addEventListener("message", (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === APP_COMPLETE_RESPONSE_TYPE) {
          resolve(e);
        }
      });
    });

    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: "x", prompt: "trigger" }, "*");

    const event = await reply;
    expect(event.data).toMatchObject({
      type: APP_COMPLETE_RESPONSE_TYPE,
      id: "x",
      error: "boom",
    });
    bridge.dispose();
  });

  it("ignores messages without the request type", async () => {
    const complete = vi.fn(async () => "should not be called");
    const bridge = createAppCompleteBridge({ complete });

    window.postMessage({ type: "something:else", id: "y", prompt: "p" }, "*");
    // Give the event loop a tick.
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it("ignores requests without a string id", async () => {
    const complete = vi.fn(async () => "x");
    const bridge = createAppCompleteBridge({ complete });

    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: 123, prompt: "p" }, "*");
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it("drops messages whose origin is not in allowedOrigins", async () => {
    // happy-dom uses the document's origin for window.postMessage
    // events. Pass an allowlist that excludes it; the bridge should
    // refuse to call complete() even though the message shape is valid.
    const complete = vi.fn(async (p: string) => p);
    const bridge = createAppCompleteBridge({
      complete,
      allowedOrigins: ["https://only-this-origin.example"],
    });

    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: "ok-shape", prompt: "p" }, "*");
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it("accepts messages whose origin matches allowedOrigins", async () => {
    // Sanity check: the allowlist isn't dropping everything — when the
    // current origin is in it, the request still goes through.
    const complete = vi.fn(async (p: string) => `ok:${p}`);
    const bridge = createAppCompleteBridge({
      complete,
      allowedOrigins: [window.location.origin],
    });

    const reply = new Promise<MessageEvent>((resolve) => {
      window.addEventListener("message", (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === APP_COMPLETE_RESPONSE_TYPE) {
          resolve(e);
        }
      });
    });
    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: "allow", prompt: "x" }, "*");
    const event = await reply;
    expect(event.data).toMatchObject({ result: "ok:x" });
    bridge.dispose();
  });

  it("dispose stops further responses", async () => {
    const complete = vi.fn(async (p: string) => p);
    const bridge = createAppCompleteBridge({ complete });
    bridge.dispose();

    window.postMessage({ type: APP_COMPLETE_REQUEST_TYPE, id: "z", prompt: "p" }, "*");
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
  });
});

describe("createAppCompleteBridge reply targeting", () => {
  // These tests dispatch a MessageEvent whose `source` is a window-like
  // object with a postMessage spy, so we can inspect the targetOrigin the
  // bridge passes to the reply. `window.postMessage` (used elsewhere) routes
  // back to the same window and can't carry a foreign origin, so we
  // construct the event directly. An `allowedOrigins` allowlist that
  // includes the requester keeps the message accepted (and keeps the
  // wide-open warning quiet).
  function dispatchRequest(opts: {
    origin: string;
    spy: ReturnType<typeof vi.fn>;
    id?: string;
    prompt?: string;
  }): void {
    const source = { postMessage: opts.spy } as unknown as Window;
    const event = new MessageEvent("message", {
      data: {
        type: APP_COMPLETE_REQUEST_TYPE,
        id: opts.id ?? "req-1",
        prompt: opts.prompt ?? "hi",
      },
      origin: opts.origin,
      source,
    });
    window.dispatchEvent(event);
  }

  it("targets the reply at the requester's own origin by default", async () => {
    const complete = vi.fn(async (p: string) => `echo:${p}`);
    const bridge = createAppCompleteBridge({
      complete,
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    dispatchRequest({ origin: "https://child.example", spy, prompt: "hi" });
    // Let the async handler resolve complete() and post the reply.
    await new Promise((r) => setTimeout(r, 10));

    expect(spy).toHaveBeenCalledTimes(1);
    const [message, replyOrigin] = spy.mock.calls[0];
    // The fix: reply origin is the requester's, NOT the old hardcoded "*".
    expect(replyOrigin).toBe("https://child.example");
    expect(replyOrigin).not.toBe("*");
    expect(message).toMatchObject({
      type: APP_COMPLETE_RESPONSE_TYPE,
      id: "req-1",
      result: "echo:hi",
    });
    bridge.dispose();
  });

  it('falls back to "*" for an opaque ("null") origin', async () => {
    const complete = vi.fn(async (p: string) => `echo:${p}`);
    // Sandboxed/srcdoc iframes serialize their origin to "null", which
    // can't be used as a postMessage targetOrigin; the bridge must fall
    // back to "*" rather than passing the literal "null" through.
    const bridge = createAppCompleteBridge({ complete, allowedOrigins: ["null"] });

    const spy = vi.fn();
    dispatchRequest({ origin: "null", spy });
    await new Promise((r) => setTimeout(r, 10));

    expect(spy).toHaveBeenCalledTimes(1);
    const replyOrigin = spy.mock.calls[0][1];
    expect(replyOrigin).toBe("*");
    bridge.dispose();
  });

  it("uses an explicit targetOrigin over the requester's origin", async () => {
    const complete = vi.fn(async (p: string) => `echo:${p}`);
    const bridge = createAppCompleteBridge({
      complete,
      targetOrigin: "https://pin.example",
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    dispatchRequest({ origin: "https://child.example", spy });
    await new Promise((r) => setTimeout(r, 10));

    expect(spy).toHaveBeenCalledTimes(1);
    const replyOrigin = spy.mock.calls[0][1];
    // A pinned targetOrigin wins over the requester's own origin.
    expect(replyOrigin).toBe("https://pin.example");
    bridge.dispose();
  });

  it("targets error-path replies at the requester's origin too", async () => {
    const complete = vi.fn(async () => {
      throw new Error("boom");
    });
    const bridge = createAppCompleteBridge({
      complete,
      allowedOrigins: ["https://child.example"],
    });

    const spy = vi.fn();
    dispatchRequest({ origin: "https://child.example", spy });
    await new Promise((r) => setTimeout(r, 10));

    expect(spy).toHaveBeenCalledTimes(1);
    const [message, replyOrigin] = spy.mock.calls[0];
    expect(replyOrigin).toBe("https://child.example");
    expect(message).toMatchObject({
      type: APP_COMPLETE_RESPONSE_TYPE,
      id: "req-1",
      error: "boom",
    });
    bridge.dispose();
  });
});

describe("createAppCompleteBridge wide-open warning", () => {
  it("does not warn when allowedOrigins is set", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = createAppCompleteBridge({
      complete: vi.fn(async () => "x"),
      allowedOrigins: ["https://x.example"],
    });
    // The `!allowSet && !source` guard is false here, so no warning fires —
    // independent of whether the module-global warn-once flag has tripped.
    expect(warnSpy).not.toHaveBeenCalled();
    bridge.dispose();
    warnSpy.mockRestore();
  });

  it("does not warn when source is set", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = createAppCompleteBridge({
      complete: vi.fn(async () => "x"),
      source: window,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    bridge.dispose();
    warnSpy.mockRestore();
  });

  it("warns exactly once for wide-open creations (fresh module)", async () => {
    // The warn-once flag is module-global, so reset modules and re-import to
    // start from a clean (un-warned) state, then confirm two wide-open
    // creations produce exactly one warning.
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("./appCompleteBridge.js");

    const b1 = mod.createAppCompleteBridge({ complete: vi.fn(async () => "x") });
    const b2 = mod.createAppCompleteBridge({ complete: vi.fn(async () => "x") });

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
    // The function-form and string-form must stay in sync; they're the
    // two ways hosts can install the shim and any drift would break
    // half the integrations.
    expect(installAppCompleteIframeShim.toString()).toContain("APP_COMPLETE_IFRAME_SHIM_SCRIPT");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// End-to-end iframe-shim round-trip.
//
// The blocks above test the parent bridge and shim isolation. Real apps
// mount the shim inside an iframe and the unit tests don't catch wire-
// protocol drift between request and response. These tests mount a real
// iframe, install the shim via `contentWindow.eval` (the closest happy-dom
// gets to a <script> tag — srcdoc scripts don't execute in v20), and act
// as the parent: capture the shim's request, post back a response, then
// assert the iframe's `window.app.complete` promise resolves/rejects with
// the right value.
//
// Why not wire up the full parent bridge here? happy-dom v20 doesn't route
// `event.source.postMessage(...)` back to the iframe's listeners, so the
// bridge's reply path can't be exercised in this DOM. The parent bridge's
// behavior is covered by the in-isolation tests above; both sides import
// the same `APP_COMPLETE_REQUEST_TYPE` / `APP_COMPLETE_RESPONSE_TYPE`
// constants, so protocol drift is caught at compile time. A real-browser
// (Playwright) test would be needed to exercise the bridge's reply path
// against a real iframe.
// ─────────────────────────────────────────────────────────────────────────

interface IframeAppWindow {
  eval: (src: string) => unknown;
  app?: { complete?: (p: string) => Promise<string> };
}

async function mountIframeWithShim(): Promise<{
  iframe: HTMLIFrameElement;
  iw: IframeAppWindow;
}> {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  // Give happy-dom a tick to finish initialising contentWindow.
  await new Promise((r) => setTimeout(r, 10));
  const iw = iframe.contentWindow as unknown as IframeAppWindow;
  iw.eval(APP_COMPLETE_IFRAME_SHIM_SCRIPT);
  return { iframe, iw };
}

interface ShimRequest {
  type: string;
  id: string;
  prompt: string;
}

/**
 * Wire a parent-side responder that captures requests from a specific
 * iframe and lets the test post back responses. This stands in for the
 * real parent bridge in happy-dom (which can't route bridge replies via
 * `event.source.postMessage`).
 */
function attachIframeResponder(
  iframe: HTMLIFrameElement,
  respond: (
    req: ShimRequest
  ) => { result?: string; error?: string } | Promise<{ result?: string; error?: string }>
): () => void {
  const handler = async (event: MessageEvent): Promise<void> => {
    const data = event.data as { type?: unknown; id?: unknown; prompt?: unknown };
    if (data?.type !== APP_COMPLETE_REQUEST_TYPE) return;
    if (typeof data.id !== "string") return;
    const req: ShimRequest = {
      type: data.type as string,
      id: data.id,
      prompt: String(data.prompt ?? ""),
    };
    const out = await respond(req);
    // Post directly to the iframe (this DOES work in happy-dom).
    iframe.contentWindow!.postMessage(
      { type: APP_COMPLETE_RESPONSE_TYPE, id: req.id, ...out },
      "*"
    );
  };
  window.addEventListener("message", handler);
  return (): void => window.removeEventListener("message", handler);
}

describe("appCompleteBridge round-trip (iframe shim ↔ parent)", () => {
  it("resolves window.app.complete with the response result", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, (req) => ({
      result: `echo:${req.prompt}`,
    }));

    const result = await iw.app!.complete!("hi from iframe");
    expect(result).toBe("echo:hi from iframe");

    detach();
    document.body.removeChild(iframe);
  });

  it("rejects with the response error message", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    const detach = attachIframeResponder(iframe, () => ({
      error: "upstream failure",
    }));

    await expect(iw.app!.complete!("anything")).rejects.toThrow("upstream failure");

    detach();
    document.body.removeChild(iframe);
  });

  it("correlates concurrent requests by id (no cross-talk)", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    let counter = 0;
    const detach = attachIframeResponder(iframe, async (req) => {
      // Resolve out-of-order on purpose: longer prompts come back later.
      // Without ID correlation, the shim would mismatch results with
      // their original callers.
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

    detach();
    document.body.removeChild(iframe);
  });

  it("ignores response messages with a non-matching id", async () => {
    const { iframe, iw } = await mountIframeWithShim();

    // First post a response with the wrong id, then the right one.
    // The shim must skip the first and resolve with the second.
    const detach = attachIframeResponder(iframe, async (req) => {
      iframe.contentWindow!.postMessage(
        { type: APP_COMPLETE_RESPONSE_TYPE, id: "not-the-id", result: "WRONG" },
        "*"
      );
      // Tiny delay so the wrong-id response is processed first.
      await new Promise((r) => setTimeout(r, 5));
      return { result: `right:${req.prompt}` };
    });

    const result = await iw.app!.complete!("p");
    expect(result).toBe("right:p");

    detach();
    document.body.removeChild(iframe);
  });

  it("ignores messages without the response type", async () => {
    const { iframe, iw } = await mountIframeWithShim();

    const detach = attachIframeResponder(iframe, async (req) => {
      // Post an unrelated message that happens to share the id.
      iframe.contentWindow!.postMessage(
        { type: "something:else", id: req.id, result: "WRONG" },
        "*"
      );
      await new Promise((r) => setTimeout(r, 5));
      return { result: `right:${req.prompt}` };
    });

    const result = await iw.app!.complete!("p");
    expect(result).toBe("right:p");

    detach();
    document.body.removeChild(iframe);
  });

  it("rejects with a timeout error when the parent never responds", async () => {
    const { iframe, iw } = await mountIframeWithShim();
    // Shrink the default to keep the test fast. The shim reads this from
    // the iframe's own window object at call time, so this only affects
    // calls originating from this iframe.
    (iw as unknown as { APP_COMPLETE_TIMEOUT_MS?: number }).APP_COMPLETE_TIMEOUT_MS = 30;
    // No responder attached → parent never replies.

    await expect(iw.app!.complete!("hi")).rejects.toThrow(/timed out after 30ms/);

    document.body.removeChild(iframe);
  });

  it("exports a sane default timeout constant", () => {
    expect(APP_COMPLETE_DEFAULT_TIMEOUT_MS).toBeGreaterThan(1_000);
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(String(APP_COMPLETE_DEFAULT_TIMEOUT_MS));
  });

  it("shim and bridge share the same request and response type constants", () => {
    // Compile-time guarantee — these are the same imports the iframe
    // shim's IIFE template-strings in. Re-asserting at runtime would be
    // redundant; this test is a sentinel to fail loudly if someone
    // renames one constant but not the other.
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(JSON.stringify(APP_COMPLETE_REQUEST_TYPE));
    expect(APP_COMPLETE_IFRAME_SHIM_SCRIPT).toContain(JSON.stringify(APP_COMPLETE_RESPONSE_TYPE));
  });
});
