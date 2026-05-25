// @vitest-environment node
/**
 * Headless-Chrome smoke tests for the standalone HTML export.
 *
 * The unit tests in `appExport.test.ts` verify the function returns a
 * string with the right shape. They miss runtime failures: Babel
 * standalone could choke on a syntax variant, the import-stripping
 * regex could miss a real case the model writes, the Tailwind Play
 * CDN could load too late and leave classes unstyled, or the esm.sh
 * UMD bundles could fail to expose the expected window global. These
 * only show up when the HTML actually runs in a browser.
 *
 * Strategy: write the export to a temp file, open it from `file://` in
 * headless Chromium (the same URL scheme an end-user gets from a
 * download link), then assert the live DOM matches expectations. Real
 * CDNs are hit — these tests need network. Skipped automatically when
 * Playwright's Chromium isn't available, so contributors without the
 * browser binary aren't blocked.
 *
 * Excluded from `pnpm test` via vitest.config.mts; run with
 * `pnpm test:browser`. Each test runs ~3-5 s (browser launch + CDN
 * downloads), so the suite stays small on purpose — one case per
 * failure mode worth catching.
 */

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportAppToHtml } from "./appExport.js";

// Best-effort: skip the whole file when Playwright + Chromium aren't
// available locally. Lets contributors run `pnpm test:browser` without
// install errors blocking unrelated work.
const playwrightAvailable = await (async (): Promise<boolean> => {
  try {
    const { chromium } = await import("playwright");
    return Boolean(chromium.executablePath());
  } catch {
    return false;
  }
})();

describe.skipIf(!playwrightAvailable)("exportAppToHtml (headless browser)", () => {
  let browser: import("playwright").Browser;
  let workDir: string;

  beforeAll(async () => {
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
    workDir = mkdtempSync(join(tmpdir(), "anuma-appexport-"));
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  async function load(
    html: string,
    fileName = "index.html"
  ): Promise<{ page: import("playwright").Page; errors: string[] }> {
    const file = join(workDir, fileName);
    writeFileSync(file, html, "utf-8");
    const page = await browser.newPage();
    const errors: string[] = [];
    // Surface page-level JS errors so we can fail with a useful
    // message instead of just timing out on a missing selector.
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });
    await page.goto(pathToFileURL(file).toString());
    return { page, errors };
  }

  it("Babel compiles JSX and the React app mounts to #root", async () => {
    const app = `import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1 id="hello">Counter</h1>
      <button id="inc" onClick={() => setCount(c => c + 1)}>+</button>
      <span id="value">{count}</span>
    </div>
  );
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app, "App.css": "body { background: #fff; }" },
      tailwind: false,
      windowAppShim: "",
    });
    const { page, errors } = await load(html, "compile.html");
    await page.waitForSelector("#hello", { timeout: 15_000 });
    expect(await page.textContent("#hello")).toBe("Counter");
    expect(await page.textContent("#value")).toBe("0");
    // Click the button — proves the closure over `setCount` survived
    // Babel + the rewritten React import.
    await page.click("#inc");
    expect(await page.textContent("#value")).toBe("1");
    expect(errors, errors.join("\n")).toEqual([]);
  }, 30_000);

  it("Tailwind Play CDN actually applies utility classes", async () => {
    const app = `import React from 'react';
export default function App() {
  return <div id="t" className="bg-red-500 text-white p-4">tw</div>;
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app },
      windowAppShim: "",
    });
    const { page } = await load(html, "tailwind.html");
    await page.waitForSelector("#t");
    // Tailwind Play CDN runs JIT in-browser; give it a moment to
    // emit the stylesheet and apply.
    await page.waitForFunction(
      () => {
        const el = document.getElementById("t");
        if (!el) return false;
        const bg = getComputedStyle(el).backgroundColor;
        // bg-red-500 = rgb(239 68 68). We just check it's not the
        // default transparent / white — proves the class was matched.
        return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
      },
      { timeout: 10_000 }
    );
    const bg = await page.evaluate(
      () => getComputedStyle(document.getElementById("t")!).backgroundColor
    );
    // Red-500 in either rgb() form.
    expect(bg).toMatch(/239\s*,?\s*68\s*,?\s*68/);
  }, 30_000);

  it("default window.app.complete stub resolves to a string", async () => {
    const app = `import React, { useState, useEffect } from 'react';

export default function App() {
  const [reply, setReply] = useState('pending');
  useEffect(() => {
    window.app.complete('explain why').then(setReply).catch((e) => setReply('error:' + e.message));
  }, []);
  return <pre id="out">{reply}</pre>;
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app },
      tailwind: false,
    });
    const { page, errors } = await load(html, "stub.html");
    await page.waitForFunction(
      () => document.getElementById("out")?.textContent !== "pending",
      { timeout: 10_000 }
    );
    const out = await page.textContent("#out");
    // The stub's "explain" branch returns a sentence with this prefix.
    expect(out).toMatch(/Here's an explanation:/);
    expect(errors, errors.join("\n")).toEqual([]);
  }, 30_000);

  it("import-stripping survives common variants the model writes", async () => {
    // Each line below is a real shape the system prompt produces. If
    // any one of these survives unstripped, Babel will error out
    // because `import` isn't valid inside <script type="text/babel">.
    const app = `import React, { useState, useEffect, useRef } from 'react';
import { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import './App.css';

export default function App() {
  const [n] = useState(42);
  const m = useMemo(() => n * 2, [n]);
  const ref = useRef(null);
  useEffect(() => {}, []);
  return <div id="m" ref={ref}>{m}</div>;
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app, "App.css": "" },
      tailwind: false,
      windowAppShim: "",
    });
    const { page, errors } = await load(html, "imports.html");
    await page.waitForSelector("#m", { timeout: 15_000 });
    expect(await page.textContent("#m")).toBe("84");
    expect(errors, errors.join("\n")).toEqual([]);
  }, 30_000);
});
