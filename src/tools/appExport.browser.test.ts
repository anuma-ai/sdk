// @vitest-environment node

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportAppToHtml } from "./appExport.js";

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
    await page.waitForFunction(
      () => {
        const el = document.getElementById("t");
        if (!el) return false;
        const bg = getComputedStyle(el).backgroundColor;
        return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
      },
      { timeout: 10_000 }
    );
    const bg = await page.evaluate(
      () => getComputedStyle(document.getElementById("t")!).backgroundColor
    );
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
    await page.waitForFunction(() => document.getElementById("out")?.textContent !== "pending", {
      timeout: 10_000,
    });
    const out = await page.textContent("#out");
    expect(out).toMatch(/Here's an explanation:/);
    expect(errors, errors.join("\n")).toEqual([]);
  }, 30_000);

  it("import-map mode resolves every shape of React import without stripping", async () => {
    const app = `import React, { useState, useEffect, useRef } from 'react';
import { useMemo } from 'react';
import { createRoot as roo } from 'react-dom/client';
import './App.css';

export default function App() {
  const [n] = useState(42);
  const m = useMemo(() => n * 2, [n]);
  const ref = useRef(null);
  useEffect(() => {}, []);
  // Touch the alias import so an unused-import elimination wouldn't
  // hide a regression where react-dom/client failed to resolve.
  if (typeof roo !== "function") throw new Error("createRoot did not resolve");
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

  it("non-react package.json dep loads and its named imports work at runtime", async () => {
    const app = `import React from 'react';
import { Camera, X, Plus } from 'lucide-react';

export default function App() {
  return (
    <div id="container">
      <Camera id="cam" />
      <X id="x" />
      <Plus id="plus" />
    </div>
  );
}
`;
    const pkg = JSON.stringify({
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.263.1",
      },
    });
    const html = exportAppToHtml({
      files: { "App.js": app, "package.json": pkg },
      tailwind: false,
      windowAppShim: "",
    });
    const { page, errors } = await load(html, "lucide.html");
    await page.waitForSelector("#container svg", { timeout: 15_000 });
    const svgCount = await page.locator("#container svg").count();
    expect(svgCount).toBe(3);
    expect(errors, errors.join("\n")).toEqual([]);
  }, 45_000);

  it("runtime error overlay surfaces hallucinated import names instead of leaving a blank page", async () => {
    const app = `import React from 'react';
import { LayoutKanban } from 'lucide-react';
export default function App() {
  return <div id="hello"><LayoutKanban /></div>;
}
`;
    const pkg = JSON.stringify({
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.263.1",
      },
    });
    const html = exportAppToHtml({
      files: { "App.js": app, "package.json": pkg },
      tailwind: false,
      windowAppShim: "",
    });
    const file = `${workDir}/overlay-fail.html`;
    require("node:fs").writeFileSync(file, html, "utf-8");
    const page = await browser.newPage();
    page.on("pageerror", () => undefined);
    await page.goto(`file://${file}`);
    await page.waitForSelector("[data-anuma-error-overlay]", { timeout: 8000 });
    const text = await page.textContent("[data-anuma-error-overlay]");
    expect(text).toMatch(/Runtime error/);
    expect(text).toMatch(/LayoutKanban/);
    const rootChildren = await page.locator("#root > *").count();
    expect(rootChildren).toBe(1);
  }, 30_000);

  it("hooks-only import works at runtime (auto-prepended React default)", async () => {
    const app = `import { useState } from 'react';
import './App.css';

export default function App() {
  const [n, setN] = useState(0);
  return (
    <div>
      <h1 id="value">{n}</h1>
      <button id="inc" onClick={() => setN(n + 1)}>+</button>
    </div>
  );
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app, "App.css": "" },
      tailwind: false,
      windowAppShim: "",
    });
    const { page, errors } = await load(html, "hooks-only.html");
    await page.waitForSelector("#value", { timeout: 15_000 });
    expect(await page.textContent("#value")).toBe("0");
    await page.click("#inc");
    expect(await page.textContent("#value")).toBe("1");
    expect(errors, errors.join("\n")).toEqual([]);
  }, 30_000);

  it("preview environment ships a baseline reset — body margin is 0, box-sizing is border-box", async () => {
    const app = `import React from 'react';
export default function App() {
  return <div id="x">x</div>;
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app },
      tailwind: false,
      windowAppShim: "",
    });
    const { page } = await load(html, "baseline.html");
    await page.waitForSelector("#x", { timeout: 15_000 });
    const computed = await page.evaluate(() => {
      const body = document.body;
      const x = document.getElementById("x")!;
      const cs = getComputedStyle(body);
      return {
        bodyMargin: cs.margin,
        bodyBoxSizing: getComputedStyle(x).boxSizing,
        bodyFontFamily: cs.fontFamily,
      };
    });
    expect(computed.bodyMargin).toBe("0px");
    expect(computed.bodyBoxSizing).toBe("border-box");
    expect(computed.bodyFontFamily.toLowerCase()).not.toMatch(/times/);
  }, 30_000);

  it("does NOT paint the overlay when the React app mounts successfully", async () => {
    const app = `import React from 'react';
export default function App() {
  // Fire and forget — a warning should not trigger the overlay.
  console.warn("benign warning");
  return <h1 id="ok">mounted</h1>;
}
`;
    const html = exportAppToHtml({
      files: { "App.js": app },
      tailwind: false,
      windowAppShim: "",
    });
    const { page } = await load(html, "overlay-pass.html");
    await page.waitForSelector("#ok", { timeout: 15_000 });
    await page.waitForTimeout(3500);
    const overlayCount = await page.locator("[data-anuma-error-overlay]").count();
    expect(overlayCount).toBe(0);
  }, 30_000);
});
