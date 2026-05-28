/**
 * Standalone HTML export for app-generation outputs.
 *
 * The app-generation tools produce three files — App.js, App.css, and
 * package.json — that together describe a React app. `exportAppToHtml`
 * compiles them into a single self-contained HTML file that runs
 * anywhere via `file://`: it inlines App.css, strips local imports
 * from App.js, maps package.json deps to esm.sh CDN URLs, and wires
 * up React UMD + Babel standalone for in-browser JSX compilation.
 *
 * Useful for letting end users download what the model built, or for
 * embedding generated apps in iframes without a bundler. Hosts that
 * provide their own preview infrastructure (e.g. a hosted iframe with
 * a custom shim for `window.app.complete`) can pass `windowAppShim`
 * to inject their bridge in place of the default offline stub.
 *
 * @example Single-file download for an end-user:
 * ```ts
 * import { exportAppToHtml } from "@anuma/sdk/tools";
 *
 * const html = exportAppToHtml({
 *   files: {
 *     "App.js": await storage.getFile(convId, "App.js"),
 *     "App.css": await storage.getFile(convId, "App.css"),
 *     "package.json": await storage.getFile(convId, "package.json"),
 *   },
 *   title: "My Generated App",
 * });
 * // Browser:
 * const blob = new Blob([html], { type: "text/html" });
 * const url = URL.createObjectURL(blob);
 * Object.assign(document.createElement("a"), { href: url, download: "app.html" }).click();
 * ```
 *
 * @example iframe preview with a parent-side LLM bridge:
 * ```ts
 * import { exportAppToHtml, APP_COMPLETE_IFRAME_SHIM_SCRIPT } from "@anuma/sdk/tools";
 *
 * const html = exportAppToHtml({
 *   files: { ... },
 *   windowAppShim: APP_COMPLETE_IFRAME_SHIM_SCRIPT,
 * });
 * previewIframe.srcdoc = html;
 * ```
 */

/**
 * Inline JS that buffers any `error` / `unhandledrejection` event on the
 * window and, if `#root` is still empty after the React app has had time
 * to mount, paints a visible error banner into the page. Without this,
 * an unhandled import or render error leaves the user staring at the
 * body background color with no indication of what went wrong (the
 * exact failure mode we just shipped: ESM `LayoutKanban` did not
 * exist; React never mounted; preview was a blank navy rectangle).
 *
 * Buffer-then-check pattern: errors are recorded as they fire, but the
 * overlay only paints when `#root.childNodes.length === 0` after a
 * load+grace window. That means errors thrown by a successfully-
 * mounted app (e.g. user clicks a button that throws) never trigger
 * the overlay — they belong in the console and the app handles its
 * own UI. The grace covers Babel-standalone compilation time + ESM
 * resolver round-trips, which empirically takes 1-3s.
 *
 * Written in ES5 with no fancy syntax — runs in a plain `<script>`
 * (not module mode), so even very old browsers parse it.
 */
export const RUNTIME_ERROR_OVERLAY_SCRIPT = `// Runtime error overlay — surfaces a visible banner when the app fails
// to mount. See RUNTIME_ERROR_OVERLAY_SCRIPT docstring for design.
(function () {
  var errors = [];
  function record(label, message) {
    errors.push(label + ": " + message);
  }
  window.addEventListener("error", function (e) {
    record("Error", (e.error && e.error.message) || e.message || String(e));
  });
  window.addEventListener("unhandledrejection", function (e) {
    var msg = (e.reason && (e.reason.message || String(e.reason))) || "unknown";
    record("Unhandled rejection", msg);
  });
  function paint() {
    var root = document.getElementById("root");
    if (!root) return;
    if (root.childNodes.length > 0) return;
    if (errors.length === 0) return;
    var box = document.createElement("div");
    box.setAttribute("data-anuma-error-overlay", "");
    box.style.cssText = "position:fixed;inset:0;background:#1a0c0c;color:#ffb4b4;font:14px/1.5 ui-monospace,Menlo,monospace;padding:24px;overflow:auto;z-index:99999";
    var h = document.createElement("h2");
    h.textContent = "Runtime error — the React app did not mount";
    h.style.cssText = "color:#ff8080;margin:0 0 16px;font-size:16px;font-weight:600";
    box.appendChild(h);
    for (var i = 0; i < errors.length; i++) {
      var p = document.createElement("p");
      p.textContent = errors[i];
      p.style.cssText = "margin:0 0 10px;white-space:pre-wrap;font-family:inherit";
      box.appendChild(p);
    }
    var hint = document.createElement("p");
    hint.textContent = "Common causes: an imported export name that doesn't exist in the package, a syntax error in App.js, a missing dependency in package.json, or a network failure loading a CDN module.";
    hint.style.cssText = "margin:18px 0 0;color:#a08080;font-size:12px;line-height:1.55";
    box.appendChild(hint);
    root.appendChild(box);
  }
  function schedule() {
    setTimeout(paint, 3000);
  }
  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule);
  }
})();`;

/**
 * Baseline CSS that defines what the model can assume about the preview
 * environment — applied before `App.css` in both `exportAppToHtml`'s
 * standalone output and the chat host's Sandpack iframe template.
 *
 * Why this exists: the model writes CSS targeting component classes
 * (`.app-shell`, `.card`) but rarely resets the surrounding `html` /
 * `body` chrome. In environments without a preflight (Sandpack's bare
 * iframe), browser defaults leak through — the visible symptom is the
 * 8 px `body` margin everyone notices, but the same root cause produces
 * `content-box` sizing surprises, Times-serif fallback on stray text
 * outside styled wrappers, and `<img>` baseline gaps. Tailwind's
 * preflight solves it at scale in environments that bundle Tailwind;
 * we provide the minimal equivalent for environments that don't.
 *
 * Design rules:
 *
 *   - Only fix actual leaks (rules that surface as visible bugs).
 *     Don't ship a maximal reset like normalize.css — every entry here
 *     should be defensible as "the model would have to fight this
 *     default anyway."
 *   - Loaded BEFORE the model's `App.css`. CSS specificity ties go to
 *     the later-loaded rule, so the model's CSS still wins on every
 *     property it sets. The baseline only provides defaults for what
 *     the model didn't set.
 *   - Stays in sync between `exportAppToHtml` (standalone download)
 *     and the host's Sandpack template (chat preview). Single source
 *     of truth so the two environments render identically.
 */
export const APP_PREVIEW_BASELINE_CSS = `*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; min-height: 100%; }
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}
img, picture, video, canvas, svg { display: block; max-width: 100%; }
button, input, select, textarea { font: inherit; }`;

/** Stub for `window.app.complete` that returns canned responses based on
 *  keyword detection. Used when no real LLM backend is available — keeps
 *  the visual preview interactive enough to demo. The default value of
 *  `ExportAppOptions.windowAppShim`. */
export const APP_COMPLETE_STUB_SCRIPT =`// Offline stub for window.app.complete — returns canned responses so the
// preview is interactive without a real backend. Replace by passing
// windowAppShim to exportAppToHtml (e.g. APP_COMPLETE_IFRAME_SHIM_SCRIPT
// for parent-iframe postMessage bridging) or by overwriting at runtime.
window.app = window.app || {};
window.app.complete = async function (prompt) {
  console.info("[stub] window.app.complete called:", String(prompt).slice(0, 120));
  await new Promise((r) => setTimeout(r, 400));
  var p = String(prompt || "").toLowerCase();
  if (p.includes("correct") || p.includes("grade") || p.includes("evaluate")) {
    return "✓ Correct — that's the right answer. (stub response)";
  }
  if (p.includes("explain") || p.includes("why") || p.includes("how")) {
    return "Here's an explanation: this is a stub response. Wire window.app.complete to a real LLM to see actual reasoning.";
  }
  if (p.includes("summarize") || p.includes("summary")) {
    return "Summary: (stub response — connect to a real backend for real summaries.)";
  }
  return "Stub AI response. Replace window.app.complete with a real backend bridge to enable real generations.";
};`;

export interface ExportAppOptions {
  /** Map of file path → file content. Must include `App.js` (or `App.jsx`).
   *  Optional: `App.css`, `package.json`. Other files are ignored — the
   *  output is single-file. */
  files: Record<string, string>;
  /** `<title>` for the page. Defaults to `"App"`. */
  title?: string;
  /** Include the Tailwind Play CDN `<script>`. Defaults to `true`. Set
   *  to `false` if the generated app uses only the inlined App.css. */
  tailwind?: boolean;
  /** JS source installed before the React app boots — typically sets up
   *  `window.app.complete` (and any related helpers). Defaults to
   *  {@link APP_COMPLETE_STUB_SCRIPT}, an offline canned-response stub.
   *  Pass {@link APP_COMPLETE_IFRAME_SHIM_SCRIPT} for an iframe embed
   *  with a parent-side bridge, or `""` to omit entirely. */
  windowAppShim?: string;
}

/**
 * Compile an app-generation output (App.js + App.css + package.json) into
 * a single self-contained HTML file. See module docstring for examples.
 *
 * Loader strategy: native ESM via `<script type="importmap">` resolves
 * every package name (react, react-dom/client, plus whatever's in
 * package.json) to an esm.sh URL. Babel-standalone runs the App.js
 * source as `<script type="text/babel" data-type="module">` so JSX is
 * compiled to JS but imports stay as ES-module imports — the browser
 * resolves them through the importmap. No window globals, no UMD
 * sequencing, no per-package compatibility wrappers.
 */
export function exportAppToHtml(options: ExportAppOptions): string {
  const {
    files,
    title = "App",
    tailwind = true,
    windowAppShim = APP_COMPLETE_STUB_SCRIPT,
  } = options;

  const appJs = files["App.js"] ?? files["App.jsx"] ?? "";
  if (!appJs) {
    throw new Error("exportAppToHtml: files must include App.js (or App.jsx).");
  }
  const appCss = files["App.css"] ?? "";
  const packageJson = files["package.json"];

  let deps: Record<string, string> = {};
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson) as { dependencies?: Record<string, string> };
      if (pkg.dependencies) deps = pkg.dependencies;
    } catch {
      // Invalid package.json — ignore deps, still produce a working file.
    }
  }

  const importMap = buildImportMap(deps);
  const jsClean = normalizeForModule(appJs);

  const escapedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Defuse any literal `</style>` inside CSS: HTML's raw-text scanner only
  // ends the <style> element on `</style` followed by a tag terminator, so
  // inserting a backslash between `<` and `/` breaks the match without
  // changing how the CSS parser sees the rule. Same trick the spec
  // recommends for JSON-in-script.
  const safeCss = appCss.replace(/<\/(style)/gi, "<\\/$1");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>${tailwind ? `\n  <script src="https://cdn.tailwindcss.com"></script>` : ""}
  <style>${APP_PREVIEW_BASELINE_CSS}</style>
  <style>${safeCss}</style>
  <script type="importmap">
${importMap}
  </script>
</head>
<body>
  <div id="root"></div>
  <script>
${RUNTIME_ERROR_OVERLAY_SCRIPT}
  </script>${windowAppShim ? `\n  <script>\n${windowAppShim}\n  </script>` : ""}
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" data-type="module" data-presets="react">
${jsClean}
import { createRoot as __anumaCreateRoot } from "react-dom/client";
__anumaCreateRoot(document.getElementById("root")).render(<App />);
  </script>
</body>
</html>`;
}

/**
 * Build the `<script type="importmap">` JSON body covering React + every
 * non-React package.json dep. Each non-React dep gets `?external=react`
 * so the dep's own React reference resolves through our same import map
 * to the same React instance — without this, lucide-react etc. would
 * bundle their own React via esm.sh and crash on `Invalid hook call`.
 *
 * `react-scripts` is skipped — it's a CRA build tool, not a runtime dep.
 * `react` and `react-dom` are always present even when package.json
 * omits them; the App.js the model writes always imports from them.
 */
function buildImportMap(deps: Record<string, string>): string {
  const reactVersion = stripVersionRange(deps.react ?? "^18.2.0");
  const reactDomVersion = stripVersionRange(deps["react-dom"] ?? "^18.2.0");
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${reactVersion}`,
    "react-dom": `https://esm.sh/react-dom@${reactDomVersion}?external=react`,
    "react-dom/client": `https://esm.sh/react-dom@${reactDomVersion}/client?external=react`,
  };
  const skip = new Set(["react", "react-dom", "react-scripts"]);
  for (const [name, version] of Object.entries(deps)) {
    if (skip.has(name)) continue;
    const clean = stripVersionRange(version);
    imports[name] = `https://esm.sh/${name}@${clean}?external=react`;
  }
  return JSON.stringify({ imports }, null, 2)
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
}

function stripVersionRange(v: string): string {
  return v.replace(/^[\^~>=<]+/, "").trim();
}

/**
 * Lightly normalize App.js for inclusion in a `<script type="text/babel"
 * data-type="module">` block. We keep `import` statements intact —
 * the importmap resolves them — and just:
 *
 *   - drop `import './App.css'` (CSS is already inlined in the <style> block);
 *   - convert `export default function App` → `function App`, and strip
 *     a trailing `export default App;`, so the boot line we append at
 *     the end of the script can reference `App` as a local binding
 *     (defaults aren't exposed by their own identifier in module scope
 *     when written as `export default function() {}`);
 *   - ensure `React` is imported. Babel-standalone's `react` preset
 *     defaults to the classic JSX runtime, which compiles `<div />` to
 *     `React.createElement(...)` and requires `React` to be in scope.
 *     Modern apps that only `import { useState } from "react"` would
 *     throw `React is not defined` without this. Prepend a default
 *     React import iff none is already present.
 */
function normalizeForModule(js: string): string {
  let out = js
    // Strip CSS imports — content is already inlined in <style>.
    .replace(/^import\s+['"]\.\/App\.css['"];?\s*$/gm, "")
    // `export default function App` → `function App` (keep the name
    // available as a local binding for the boot line below).
    .replace(/^export\s+default\s+function\s+/gm, "function ")
    // Drop a trailing `export default App;` style line.
    .replace(/^export\s+default\s+\w+;\s*$/gm, "");

  // Add `import React from "react";` at the top iff the source doesn't
  // already bring React into scope under that identifier. Anchored on
  // `^` so we don't catch the substring inside a named-import list.
  const hasReactDefault =
    /^import\s+React\b/m.test(out) || /^import\s+\*\s+as\s+React\s+from/m.test(out);
  if (!hasReactDefault) {
    out = `import React from "react";\n${out}`;
  }
  return out;
}
