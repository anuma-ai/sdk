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

  const extraScripts = extraDepScripts(deps);
  const jsClean = stripImports(appJs);

  const escapedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>${tailwind ? `\n  <script src="https://cdn.tailwindcss.com"></script>` : ""}
  <style>${appCss}</style>
</head>
<body>
  <div id="root"></div>${windowAppShim ? `\n  <script>\n${windowAppShim}\n  </script>` : ""}
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>${
    extraScripts ? `\n  ${extraScripts}` : ""
  }
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
${jsClean}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  </script>
</body>
</html>`;
}

/**
 * Collect package.json deps and produce CDN `<script>` tags that load
 * each as a UMD global on `window`. esm.sh's `?bundle-deps&no-dts` mode
 * emits a self-executing UMD bundle that works on `file://` without
 * import maps. Used together with {@link stripImports} which rewrites
 * `import X from "pkg"` to `const X = window["pkg"];`.
 *
 * React and react-dom are skipped — those load from unpkg in the
 * surrounding template directly.
 */
function extraDepScripts(deps: Record<string, string>): string {
  const skip = new Set(["react", "react-dom", "react-scripts"]);
  const tags: string[] = [];
  for (const [name, version] of Object.entries(deps)) {
    if (skip.has(name)) continue;
    const clean = version.replace(/^[\^~>=<]+/, "");
    const globalName = camelCasePackage(name);
    tags.push(
      `<script src="https://esm.sh/${name}@${clean}?bundle-deps&no-dts"></script>` +
        `\n  <script>window.${globalName} = window.${globalName} || {}</script>`
    );
  }
  return tags.join("\n  ");
}

/** Convert `lucide-react` → `lucideReact`. Same scheme used by stripImports. */
function camelCasePackage(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
}

/**
 * Rewrite ES module import statements in `App.js` so the code runs inside
 * a `<script type="text/babel">` block without import maps or ESM:
 *
 *   - `import './App.css'` is stripped (CSS is inlined into the `<style>`).
 *   - `import React, { useState } from "react"` becomes
 *     `const { useState } = React;` (React is a UMD global).
 *   - `import { foo } from "lucide-react"` becomes
 *     `const { foo } = window["lucideReact"];` (any other package is
 *     loaded as UMD via {@link extraDepScripts}).
 *   - `export default function App` becomes `function App` and the
 *     trailing `export default App;` is dropped, so the global App
 *     identifier is referenceable by the boot line.
 */
function stripImports(js: string): string {
  return (
    js
      // Remove CSS imports (already inlined in <style>).
      .replace(/^import\s+['"]\.\/App\.css['"];?\s*$/gm, "")
      // `import React, { useState, ... } from 'react'` → destructure from global
      .replace(
        /^import\s+React\s*,\s*\{([^}]+)\}\s*from\s*['"]react['"];?\s*$/gm,
        (_, names: string) => `const { ${names.trim()} } = React;`
      )
      // `import { useState, ... } from 'react'` (no default)
      .replace(
        /^import\s*\{([^}]+)\}\s*from\s*['"]react['"];?\s*$/gm,
        (_, names: string) => `const { ${names.trim()} } = React;`
      )
      // `import React from 'react'`
      .replace(/^import\s+React\s+from\s*['"]react['"];?\s*$/gm, "")
      // `import ... from 'react-dom/client'` etc.
      .replace(/^import\s+.*\s+from\s*['"]react-dom(?:\/.*)?['"];?\s*$/gm, "")
      // Mixed default + named imports of external packages → both forms
      // off the same window global. e.g. `import Chart, { defaults } from 'chart.js'`.
      // Must precede the pure-named and pure-default replacements below.
      .replace(
        /^import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from\s*['"]([^'"./][^'"]*?)['"];?\s*$/gm,
        (_, name: string, names: string, pkg: string) => {
          const globalName = camelCasePackage(pkg);
          return `const ${name} = window["${globalName}"] || {}; const { ${names.trim()} } = window["${globalName}"] || {};`;
        }
      )
      // Other named imports → destructure from window global
      .replace(
        /^import\s*\{([^}]+)\}\s*from\s*['"]([^'"./][^'"]*?)['"];?\s*$/gm,
        (_, names: string, pkg: string) => {
          const globalName = camelCasePackage(pkg);
          return `const { ${names.trim()} } = window["${globalName}"] || {};`;
        }
      )
      // Default imports of external packages → window global
      .replace(
        /^import\s+(\w+)\s+from\s*['"]([^'"./][^'"]*?)['"];?\s*$/gm,
        (_, name: string, pkg: string) => {
          const globalName = camelCasePackage(pkg);
          return `const ${name} = window["${globalName}"] || {};`;
        }
      )
      // Strip `export default function App` → `function App`
      .replace(/^export\s+default\s+function\s+/gm, "function ")
      // Strip `export default App;`
      .replace(/^export\s+default\s+\w+;\s*$/gm, "")
  );
}
