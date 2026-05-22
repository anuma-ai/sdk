/**
 * Unit tests for the standalone HTML export. Validates that
 * exportAppToHtml inlines CSS, strips local imports, maps deps to
 * esm.sh, includes the configured window.app shim, and produces
 * working markup. No browser or LLM in the loop.
 */

import { describe, expect, it } from "vitest";

import {
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_STUB_SCRIPT,
  exportAppToHtml,
} from "./index.js";

describe("exportAppToHtml", () => {
  const trivialApp = `import React from 'react';
import './App.css';

export default function App() {
  return <div>hi</div>;
}
`;

  it("produces a single HTML document with App.js inlined", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>App</title>");
    expect(html).toContain("function App() {");
    expect(html).toContain("ReactDOM.createRoot");
  });

  it("inlines App.css inside a <style> block", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "App.css": ".btn { color: red; }" },
    });
    expect(html).toContain("<style>.btn { color: red; }</style>");
  });

  it("strips `import './App.css';` from the JS (CSS is inlined)", () => {
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "App.css": "" },
    });
    expect(html).not.toContain("import './App.css'");
    expect(html).not.toContain('import "./App.css"');
  });

  it("rewrites `import React from 'react'` so React loads from UMD", () => {
    const html = exportAppToHtml({ files: { "App.js": trivialApp } });
    // The React UMD bundle is loaded via <script src=...>; the App.js
    // import line itself is stripped.
    expect(html).toContain("react@18/umd/react.development.js");
    expect(html).not.toMatch(/^import\s+React\s+from\s*['"]react['"]/m);
  });

  it("destructures named React imports from the UMD global", () => {
    const src = `import React, { useState, useEffect } from 'react';
export default function App() { return null; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain("const { useState, useEffect } = React;");
  });

  it("maps package.json deps to esm.sh CDN scripts as UMD globals", () => {
    const pkg = JSON.stringify({
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.400.0",
      },
    });
    const html = exportAppToHtml({
      files: { "App.js": trivialApp, "package.json": pkg },
    });
    // React + react-dom are skipped because the template handles them.
    // lucide-react gets an esm.sh script + a window global initializer.
    expect(html).toContain("https://esm.sh/lucide-react@0.400.0?bundle-deps&no-dts");
    expect(html).toContain("window.lucideReact = window.lucideReact || {}");
    // Skipped — should NOT show up as an esm.sh script.
    expect(html).not.toContain("https://esm.sh/react@");
    expect(html).not.toContain("https://esm.sh/react-dom@");
  });

  it("rewrites named imports of external packages to window globals", () => {
    const src = `import React from 'react';
import { Camera, X } from 'lucide-react';
import Slider from 'rc-slider';

export default function App() { return <Camera />; }
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    expect(html).toContain('const { Camera, X } = window["lucideReact"] || {};');
    expect(html).toContain('const Slider = window["rcSlider"] || {};');
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
    // No esm.sh script — bad JSON yielded no deps.
    expect(html).not.toContain("esm.sh");
  });

  it("strips `export default function App` and `export default App;` so the global is referenceable", () => {
    const src = `function App() { return null; }
export default App;
`;
    const html = exportAppToHtml({ files: { "App.js": src } });
    // Boot line still references App.
    expect(html).toContain('ReactDOM.createRoot(document.getElementById("root")).render(<App />)');
    // export default App; is gone.
    expect(html).not.toMatch(/^export\s+default\s+App\s*;\s*$/m);
  });

  it("APP_COMPLETE_STUB_SCRIPT is a non-empty string with the right shape", () => {
    expect(APP_COMPLETE_STUB_SCRIPT).toContain("window.app");
    expect(APP_COMPLETE_STUB_SCRIPT).toContain("complete");
    expect(APP_COMPLETE_STUB_SCRIPT.length).toBeGreaterThan(100);
  });
});
