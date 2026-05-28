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

/** Stub for `window.app.complete` that returns canned responses based on
 *  keyword detection. Used when no real LLM backend is available — keeps
 *  the visual preview interactive enough to demo. The default value of
 *  `ExportAppOptions.windowAppShim`. */
export const APP_COMPLETE_STUB_SCRIPT = `// Offline stub for window.app.complete — returns canned responses so the
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
  <style>${safeCss}</style>
  <script type="importmap">
${importMap}
  </script>
</head>
<body>
  <div id="root"></div>${windowAppShim ? `\n  <script>\n${windowAppShim}\n  </script>` : ""}
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
 *     when written as `export default function() {}`).
 */
function normalizeForModule(js: string): string {
  return (
    js
      // Strip CSS imports — content is already inlined in <style>.
      .replace(/^import\s+['"]\.\/App\.css['"];?\s*$/gm, "")
      // `export default function App` → `function App` (keep the name
      // available as a local binding for the boot line below).
      .replace(/^export\s+default\s+function\s+/gm, "function ")
      // Drop a trailing `export default App;` style line.
      .replace(/^export\s+default\s+\w+;\s*$/gm, "")
  );
}
