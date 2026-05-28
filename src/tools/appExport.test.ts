/**
 * Unit tests for the standalone HTML export. Validates that
 * exportAppToHtml inlines CSS, builds the importmap, keeps App.js
 * imports intact, and produces working markup. No browser or LLM in
 * the loop — for runtime rendering checks see appExport.browser.test.ts.
 */

import { describe, expect, it } from "vitest";

import {
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_STUB_SCRIPT,
  APP_PREVIEW_BASELINE_CSS,
  exportAppToHtml,
  RUNTIME_ERROR_OVERLAY_SCRIPT,
} from "./index.js";

describe("exportAppToHtml", () => {
  const trivialApp = `import React from 'react';
import './App.css';

export default function App() {
  return <div>hi</div>;
}
`;

  /** Pull the JSON body out of the importmap script tag. */
  function readImportMap(html: string): Record<string, string> {
    const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    if (!m) throw new Error("no importmap in html");
    return (JSON.parse(m[1]) as { imports: Record<string, string> }).imports;
  }

  it("produces a single HTML document with App.js inlined", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>App</title>");
    expect(html).toContain("function App() {");
    // Boot line uses the new module-friendly mount.
    expect(html).toContain('__anumaCreateRoot(document.getElementById("root")).render(<App />)');
  });

  it("loads Babel-standalone in module mode for JSX-in-ESM", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(html).toContain('<script type="text/babel" data-type="module" data-presets="react">');
  });

  it("includes an importmap with react / react-dom / react-dom/client by default", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    const imports = readImportMap(html);
    expect(imports.react).toMatch(/^https:\/\/esm\.sh\/react@/);
    expect(imports["react-dom"]).toMatch(/^https:\/\/esm\.sh\/react-dom@/);
    expect(imports["react-dom/client"]).toMatch(
      /^https:\/\/esm\.sh\/react-dom@[^/]+\/client\?external=react$/
    );
  });

  it("inlines App.css inside a <style> block", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "App.css": ".btn { color: red; }" },
    });
    expect(html).toContain("<style>.btn { color: red; }</style>");
  });

  it("defuses `</style>` strings inside App.css so the tag can't break out", () => {
    const html = exportAppToHtml({
      files: {
        "App.js": trivialApp,
        "App.css": '.x { content: "</style>oops"; }',
      },
    });
    // The injected `</style>` from App.css must be escaped.
    expect(html).toContain("<\\/style>");
    // Exactly two real closing `</style>` tags survive — one for the
    // APP_PREVIEW_BASELINE_CSS block, one for the App.css block. The
    // escaped `</style>` injected via the model's content shouldn't
    // count as a real tag.
    expect(html.match(/<\/style>/g)?.length).toBe(2);
  });

  it("strips `import './App.css';` from the JS (CSS is inlined)", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "App.css": "" },
    });
    expect(html).not.toContain("import './App.css'");
    expect(html).not.toContain('import "./App.css"');
  });

  it("keeps `import React from 'react'` intact — importmap resolves it", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(html).toContain("import React from 'react';");
    // No UMD script tags — the old loader is gone.
    expect(html).not.toContain("react@18/umd/react.development.js");
  });

  it("keeps named React imports as-is in the module body", () => {
    const src = `import React, { useState, useEffect } from 'react';
export default function App() { return null; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain("import React, { useState, useEffect } from 'react';");
  });

  it("prepends `import React from \"react\"` when the model only imports hooks", () => {
    // Modern apps commonly write `import { useState } from "react"` without
    // bringing React itself into scope. Babel-standalone's classic JSX
    // runtime needs `React` in scope to compile <div /> → React.createElement,
    // so the exporter has to ensure the default import is present.
    const src = `import { useState, useEffect } from 'react';
export default function App() {
  return <div>{useState(0)[0]}</div>;
}
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain('import React from "react";');
    expect(html).toContain("import { useState, useEffect } from 'react';");
  });

  it("does NOT double-import React when the model already wrote `import React from`", () => {
    const src = `import React from 'react';
export default function App() { return <div />; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    // Match both possible quote styles — single (from source) and
    // double (from the prepend). We expect exactly one occurrence.
    const matches = html.match(/import React from ['"]react['"]/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("recognises `import React, { ... }` as a React default import", () => {
    const src = `import React, { useState } from 'react';
export default function App() { return <div />; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    const matches = html.match(/import React/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("adds every non-react package.json dep to the importmap with ?external=react", () => {
    const pkg = JSON.stringify({
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.400.0",
        "framer-motion": "^11.0.0",
      },
    });
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "package.json": pkg },
    });
    const imports = readImportMap(html);
    expect(imports["lucide-react"]).toBe("https://esm.sh/lucide-react@0.400.0?external=react");
    expect(imports["framer-motion"]).toBe("https://esm.sh/framer-motion@11.0.0?external=react");
  });

  it("picks up react / react-dom versions from package.json when supplied", () => {
    const pkg = JSON.stringify({ dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" } });
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "package.json": pkg },
    });
    const imports = readImportMap(html);
    expect(imports.react).toBe("https://esm.sh/react@19.0.0");
    expect(imports["react-dom"]).toBe("https://esm.sh/react-dom@19.0.0?external=react");
  });

  it("skips `react-scripts` in the importmap (build-time, not runtime)", () => {
    const pkg = JSON.stringify({
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0", "react-scripts": "^5.0.1" },
    });
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "package.json": pkg },
    });
    const imports = readImportMap(html);
    expect(imports["react-scripts"]).toBeUndefined();
  });

  it("keeps external-package imports intact in the module body", () => {
    const src = `import React from 'react';
import { Camera, X } from 'lucide-react';
import Slider from 'rc-slider';

export default function App() { return <Camera />; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain("import { Camera, X } from 'lucide-react';");
    expect(html).toContain("import Slider from 'rc-slider';");
  });

  it("uses the offline stub for window.app.complete by default", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(html).toContain("window.app.complete");
    expect(html).toContain("[stub] window.app.complete called");
  });

  it("accepts a custom windowAppShim (e.g. the iframe bridge)", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp },
      windowAppShim: APP_COMPLETE_IFRAME_SHIM_SCRIPT,
    });
    expect(html).toContain("anuma:app:complete:request");
    expect(html).not.toContain("[stub] window.app.complete called");
  });

  it("omits the window.app shim entirely when windowAppShim is empty", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp },
      windowAppShim: "",
    });
    expect(html).not.toContain("window.app");
    expect(html).not.toContain("[stub]");
  });

  it("includes the Tailwind Play CDN by default and skips it when tailwind=false", () => {
    const withTailwind = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(withTailwind).toContain("cdn.tailwindcss.com");

    const withoutTailwind = exportAppToHtml({
      files: { "App.js": trivialApp },
      tailwind: false,
    });
    expect(withoutTailwind).not.toContain("cdn.tailwindcss.com");
  });

  it("uses the supplied title and HTML-escapes brackets", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp },
      title: "My <App> & Co.",
    });
    expect(html).toContain("<title>My &lt;App&gt; & Co.</title>");
  });

  it("falls back to App.jsx when App.js is absent", () => {
    const html = exportAppToHtml({ files: { "App.jsx": trivialApp } });
    expect(html).toContain("function App()");
  });

  it("throws when no App.js (or App.jsx) is provided", () => {
    expect(() => exportAppToHtml({ files: {} })).toThrow(/must include App\.js \(or App\.jsx\)/);
  });

  it("survives an invalid package.json without crashing (treats deps as empty)", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "package.json": "{not json" },
    });
    expect(html).toContain("function App()");
    // No extra non-react packages — importmap still has the defaults though.
    const imports = readImportMap(html);
    expect(Object.keys(imports).sort()).toEqual(["react", "react-dom", "react-dom/client"]);
  });

  it("strips `export default function App` and `export default App;` so the boot line can reference App", () => {
    const src = `function App() { return null; }
export default App;
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain('__anumaCreateRoot(document.getElementById("root")).render(<App />)');
    expect(html).not.toMatch(/^export\s+default\s+App\s*;\s*$/m);
  });

  it("APP_COMPLETE_STUB_SCRIPT is a non-empty string with the right shape", () => {
    expect(APP_COMPLETE_STUB_SCRIPT).toContain("window.app");
    expect(APP_COMPLETE_STUB_SCRIPT).toContain("complete");
    expect(APP_COMPLETE_STUB_SCRIPT.length).toBeGreaterThan(100);
  });

  it("includes the runtime error overlay inline in the body", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    // The overlay constant lands literally in the output.
    expect(html).toContain(RUNTIME_ERROR_OVERLAY_SCRIPT);
    // Sentinel attribute so the browser smoke test can find the
    // injected overlay element by query selector.
    expect(html).toContain('data-anuma-error-overlay');
    // Both error sources are wired.
    expect(html).toContain('"error"');
    expect(html).toContain('"unhandledrejection"');
  });

  it("RUNTIME_ERROR_OVERLAY_SCRIPT is plain ES5 with no module syntax", () => {
    // The overlay runs in a regular `<script>` (not module mode) so
    // it has to parse in every browser. Catch a regression where
    // someone adds `import` / `export` / `await` at top level.
    expect(RUNTIME_ERROR_OVERLAY_SCRIPT).not.toMatch(/^\s*import\s/m);
    expect(RUNTIME_ERROR_OVERLAY_SCRIPT).not.toMatch(/^\s*export\s/m);
    expect(RUNTIME_ERROR_OVERLAY_SCRIPT).not.toMatch(/^\s*await\s/m);
  });

  it("injects APP_PREVIEW_BASELINE_CSS before the user's App.css", () => {
    // The model's CSS must override the baseline on equal specificity,
    // which means the baseline has to load FIRST. If a future refactor
    // accidentally moves App.css before the baseline, the model's body
    // colors / fonts would be silently undone — this test catches that.
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "App.css": "body { margin: 100px; }" },
    });
    const baselineIdx = html.indexOf(APP_PREVIEW_BASELINE_CSS);
    const appCssIdx = html.indexOf("body { margin: 100px; }");
    expect(baselineIdx).toBeGreaterThan(0);
    expect(appCssIdx).toBeGreaterThan(0);
    expect(baselineIdx).toBeLessThan(appCssIdx);
  });

  it("APP_PREVIEW_BASELINE_CSS resets the leaks we actually care about", () => {
    // Sanity-check the contents so a refactor doesn't silently delete
    // the rules that fix the body-margin / box-sizing / serif-fallback
    // leaks. If a baseline rule is dropped, the model's apps regress
    // visually in environments without Tailwind preflight.
    expect(APP_PREVIEW_BASELINE_CSS).toMatch(/box-sizing:\s*border-box/);
    expect(APP_PREVIEW_BASELINE_CSS).toMatch(/body[^{]*\{[^}]*margin:\s*0/);
    expect(APP_PREVIEW_BASELINE_CSS).toMatch(/font-family:[^;]*system-ui/);
  });
});
