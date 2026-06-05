// @vitest-environment node
/**
 * Headless-Chrome test for the real cross-window MessagePort handshake.
 *
 * The happy-dom unit tests exercise the bridge and shim logic, but happy-dom
 * drops postMessage transfer lists — so it can't prove the one thing that only
 * a real browser does: that `postMessage(msg, origin, [port])` actually
 * transfers the port and the receiving frame sees it on `event.ports`. This
 * test runs the *real* shim string in a child file:// frame, has a parent
 * frame speak the protocol, and asserts both that `window.app.complete`
 * resolves over a genuinely-transferred port and that the prompt never appears
 * on the parent's window message bus (the confidentiality fix).
 *
 * Excluded from `pnpm test`; run with `pnpm test:browser`. Skipped when
 * Playwright's Chromium isn't installed.
 */

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  APP_COMPLETE_CONNECT_ACK_TYPE,
  APP_COMPLETE_CONNECT_TYPE,
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_REQUEST_TYPE,
  APP_COMPLETE_RESPONSE_TYPE,
} from "./appCompleteBridge.js";

const playwrightAvailable = await (async (): Promise<boolean> => {
  try {
    const { chromium } = await import("playwright");
    return Boolean(chromium.executablePath());
  } catch {
    return false;
  }
})();

const SECRET = "ULTRA-SECRET-PROMPT-7f3a9c";

// Parent page: records every message it receives, and runs a minimal bridge
// that mirrors the wire protocol (createAppCompleteBridge's logic is covered
// by the happy-dom unit tests; here we only need a real peer that hands back a
// real MessagePort so the shim's transfer path runs).
const PARENT_HTML = `<!doctype html><html><body>
<script>
  window.__topMessages = [];
  window.addEventListener("message", function (e) {
    try { window.__topMessages.push(JSON.parse(JSON.stringify(e.data))); }
    catch (_) { window.__topMessages.push(String(e.data)); }
  });
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== ${JSON.stringify(APP_COMPLETE_CONNECT_TYPE)} || typeof d.id !== "string") return;
    var ch = new MessageChannel();
    ch.port1.onmessage = function (ev) {
      var rd = ev.data;
      if (!rd || rd.type !== ${JSON.stringify(APP_COMPLETE_REQUEST_TYPE)} || typeof rd.id !== "string") return;
      ch.port1.postMessage({ type: ${JSON.stringify(APP_COMPLETE_RESPONSE_TYPE)}, id: rd.id, result: "echo:" + rd.prompt });
    };
    var origin = (e.origin && e.origin !== "null") ? e.origin : "*";
    e.source.postMessage({ type: ${JSON.stringify(APP_COMPLETE_CONNECT_ACK_TYPE)}, id: d.id }, origin, [ch.port2]);
  });
  var iframe = document.createElement("iframe");
  iframe.src = "child.html";
  document.body.appendChild(iframe);
</script>
</body></html>`;

const CHILD_HTML = `<!doctype html><html><body>
<script src="shim.js"></script>
<script>
  window.app.complete(${JSON.stringify(SECRET)})
    .then(function (r) { document.body.setAttribute("data-result", r); })
    .catch(function (e) { document.body.setAttribute("data-error", (e && e.message) || String(e)); });
</script>
</body></html>`;

describe.skipIf(!playwrightAvailable)("appCompleteBridge real-browser handshake", () => {
  let browser: import("playwright").Browser;
  let workDir: string;

  beforeAll(async () => {
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
    workDir = mkdtempSync(join(tmpdir(), "anuma-appbridge-"));
    writeFileSync(join(workDir, "shim.js"), APP_COMPLETE_IFRAME_SHIM_SCRIPT, "utf-8");
    writeFileSync(join(workDir, "child.html"), CHILD_HTML, "utf-8");
    writeFileSync(join(workDir, "parent.html"), PARENT_HTML, "utf-8");
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  it("resolves window.app.complete over a transferred port, without leaking the prompt", async () => {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(pathToFileURL(join(workDir, "parent.html")).toString());

    // Find the child frame and wait for it to report a result (or error).
    let child: import("playwright").Frame | undefined;
    for (let i = 0; i < 100 && !child; i++) {
      child = page.frames().find((f) => f.url().endsWith("child.html"));
      if (!child) await page.waitForTimeout(50);
    }
    if (!child) throw new Error("child frame never appeared");

    await child.waitForFunction(
      () =>
        !!(document.body.getAttribute("data-result") || document.body.getAttribute("data-error")),
      undefined,
      { timeout: 15_000 }
    );
    const result = await child.evaluate(() => document.body.getAttribute("data-result"));
    const error = await child.evaluate(() => document.body.getAttribute("data-error"));

    // The handshake + real port transfer worked end to end.
    expect(error, error ?? "").toBeNull();
    expect(result).toBe(`echo:${SECRET}`);
    expect(errors, errors.join("\n")).toEqual([]);

    // Confidentiality: the parent window only ever saw content-free connect
    // announcements — the prompt traveled exclusively over the private port.
    const topMessages = await page.evaluate(
      () => (window as unknown as { __topMessages: { type?: string }[] }).__topMessages
    );
    expect(topMessages.length).toBeGreaterThan(0);
    for (const m of topMessages) expect(m.type).toBe(APP_COMPLETE_CONNECT_TYPE);
    expect(JSON.stringify(topMessages)).not.toContain(SECRET);

    await page.close();
  }, 30_000);
});
