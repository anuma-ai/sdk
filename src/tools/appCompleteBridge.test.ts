// @vitest-environment happy-dom
/**
 * Tests for the parent ↔ iframe bridge for window.app.complete.
 *
 * happy-dom is enough for postMessage + addEventListener; the bridge
 * doesn't touch React, the DOM, or layout.
 */

import { describe, expect, it, vi } from "vitest";

import {
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

    window.postMessage(
      { type: APP_COMPLETE_REQUEST_TYPE, id: "abc", prompt: "hi" },
      "*"
    );

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

    window.postMessage(
      { type: APP_COMPLETE_REQUEST_TYPE, id: "x", prompt: "trigger" },
      "*"
    );

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

    window.postMessage(
      { type: APP_COMPLETE_REQUEST_TYPE, id: 123, prompt: "p" },
      "*"
    );
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it("dispose stops further responses", async () => {
    const complete = vi.fn(async (p: string) => p);
    const bridge = createAppCompleteBridge({ complete });
    bridge.dispose();

    window.postMessage(
      { type: APP_COMPLETE_REQUEST_TYPE, id: "z", prompt: "p" },
      "*"
    );
    await new Promise((r) => setTimeout(r, 10));

    expect(complete).not.toHaveBeenCalled();
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
    expect(installAppCompleteIframeShim.toString()).toContain(
      "APP_COMPLETE_IFRAME_SHIM_SCRIPT"
    );
  });
});
