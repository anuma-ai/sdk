/**
 * Shared setup for app-generation tool e2e tests.
 *
 * Extends the base test/tools/setup.ts with app-generation-specific
 * utilities: in-memory file store, snapshot/diff, and output dumping.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Override portal base URL
 *   E2E_MODEL        (optional)  Model override
 *   E2E_API_TYPE     (optional)  "completions" or "responses"
 */

import fs from "node:fs";
import path from "node:path";

import { runToolLoop } from "../../../src/lib/chat/toolLoop.js";

export { config, extractText, printResult, wrapTool, type ToolCallLog } from "../setup.js";
export { runToolLoop };

/** Wrapper that times the tool loop and logs the duration. */
export async function timedToolLoop(
  ...args: Parameters<typeof runToolLoop>
): Promise<Awaited<ReturnType<typeof runToolLoop>> & { elapsedMs: number }> {
  const start = performance.now();
  const result = await runToolLoop(...args);
  const elapsedMs = Math.round(performance.now() - start);
  console.log(`  Tool loop: ${(elapsedMs / 1000).toFixed(1)}s`);
  return { ...result, elapsedMs };
}

// ---------------------------------------------------------------------------
// In-memory file store (replaces IndexedDB for tests)
// ---------------------------------------------------------------------------

export type FileStore = Map<string, string>;

export function createFileStore(): FileStore {
  return new Map();
}

// ---------------------------------------------------------------------------
// Snapshot & diff utilities
// ---------------------------------------------------------------------------

/** Take a snapshot of the file store (deep copy). */
export function snapshot(store: FileStore): Map<string, string> {
  return new Map(store);
}

/** Diff two file store snapshots. Returns per-file change details. */
export interface FileDiff {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  linesChanged: number;
  totalLines: number;
  changedLineNumbers: number[];
}

function diffFile(p: string, b: string | undefined, a: string | undefined): FileDiff {
  if (b === undefined && a !== undefined) {
    const lines = a.split("\n");
    return {
      path: p,
      status: "added",
      linesChanged: lines.length,
      totalLines: lines.length,
      changedLineNumbers: lines.map((_, i) => i + 1),
    };
  }
  if (b !== undefined && a === undefined) {
    return {
      path: p,
      status: "removed",
      linesChanged: b.split("\n").length,
      totalLines: 0,
      changedLineNumbers: [],
    };
  }
  if (b === a) {
    return {
      path: p,
      status: "unchanged",
      linesChanged: 0,
      totalLines: (a ?? "").split("\n").length,
      changedLineNumbers: [],
    };
  }
  const bLines = (b ?? "").split("\n");
  const aLines = (a ?? "").split("\n");
  const changed: number[] = [];
  for (let i = 0; i < Math.max(bLines.length, aLines.length); i++) {
    if (bLines[i] !== aLines[i]) changed.push(i + 1);
  }
  return {
    path: p,
    status: "modified",
    linesChanged: changed.length,
    totalLines: aLines.length,
    changedLineNumbers: changed,
  };
}

export function diffSnapshots(before: Map<string, string>, after: Map<string, string>): FileDiff[] {
  const allPaths = new Set([...before.keys(), ...after.keys()]);
  return [...allPaths].map((p) => diffFile(p, before.get(p), after.get(p)));
}

/** Log a diff summary to console. */
export function printDiff(label: string, diffs: FileDiff[]): void {
  console.log(`  --- ${label} ---`);
  for (const d of diffs) {
    if (d.status === "unchanged") {
      console.log(`  ${d.path}: unchanged (${d.totalLines} lines)`);
    } else if (d.status === "added") {
      console.log(`  ${d.path}: +added (${d.linesChanged} lines)`);
    } else if (d.status === "removed") {
      console.log(`  ${d.path}: -removed`);
    } else {
      const pct = ((d.linesChanged / d.totalLines) * 100).toFixed(1);
      console.log(
        `  ${d.path}: ${d.linesChanged}/${d.totalLines} lines changed (${pct}%) — lines ${d.changedLineNumbers.join(", ")}`
      );
    }
  }
}

const OUTPUT_DIR = path.resolve(__dirname, ".output");

/**
 * Build an import-map from package.json dependencies so the browser can
 * resolve bare-specifier imports (e.g. `import { Heart } from "lucide-react"`)
 * via esm.sh without a bundler.
 */
function buildImportMap(deps: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, version] of Object.entries(deps)) {
    // Strip semver range chars (^, ~, >=, etc.) to get a clean version for the URL
    const clean = version.replace(/^[\^~>=<]+/, "");
    map[name] = `https://esm.sh/${name}@${clean}`;
    map[`${name}/`] = `https://esm.sh/${name}@${clean}/`;
  }
  // Always pin react so every package shares the same instance
  const reactVersion = deps.react?.replace(/^[\^~>=<]+/, "") ?? "18.2.0";
  for (const key of Object.keys(map)) {
    if (key === "react" || key === "react/") continue;
    const base = map[key];
    map[key] = base.includes("?")
      ? `${base}&external=react,react-dom`
      : `${base}?external=react,react-dom`;
  }
  // Ensure react/react-dom are present even if package.json omits them
  if (!map.react) {
    map.react = `https://esm.sh/react@${reactVersion}`;
    map["react/"] = `https://esm.sh/react@${reactVersion}/`;
  }
  if (!map["react-dom"]) {
    map["react-dom"] = `https://esm.sh/react-dom@${reactVersion}`;
    map["react-dom/"] = `https://esm.sh/react-dom@${reactVersion}/`;
  }
  return map;
}

/** Generate a self-contained index.html that renders App.js in the browser. */
function generateAppHtml(appDir: string, title: string): string {
  const cssPath = path.join(appDir, "App.css");
  const jsPath = path.join(appDir, "App.js");
  const pkgPath = path.join(appDir, "package.json");

  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf-8") : "";
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, "utf-8") : "";

  let deps: Record<string, string> = { react: "18.2.0", "react-dom": "18.2.0" };
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.dependencies) deps = { ...deps, ...pkg.dependencies };
    } catch {
      /* ignore parse errors */
    }
  }

  const importMap = buildImportMap(deps);

  // Strip the `import './App.css'` line — we inline the CSS instead
  const jsClean = js.replace(/^import\s+['"]\.\/App\.css['"];?\s*$/m, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${css}</style>
  <script type="importmap">
${JSON.stringify({ imports: importMap }, null, 2)}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
${jsClean}
import ReactDOM from "react-dom/client";
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</body>
</html>`;
}

/** Write an index.html into a directory if it contains App.js (works recursively for step dirs). */
function writeAppHtml(dir: string, title: string): void {
  if (fs.existsSync(path.join(dir, "App.js"))) {
    fs.writeFileSync(path.join(dir, "index.html"), generateAppHtml(dir, title), "utf-8");
  }
  // Handle step subdirectories (e.g. precision-multi/step-1-initial/)
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      writeAppHtml(full, `${title} / ${entry}`);
    }
  }
}

/** Write all files from the store to disk for inspection. */
export function dumpFiles(store: FileStore, testName: string): string {
  const dir = path.join(OUTPUT_DIR, testName.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [filePath, content] of store) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }
  writeAppHtml(dir, testName);
  console.log(`  Output written to ${path.relative(process.cwd(), dir)}/`);
  return dir;
}

/** Write a root index.html linking to all app previews. Call after all tests. */
export function writeIndex(): void {
  if (!fs.existsSync(OUTPUT_DIR)) return;
  const dirs = fs
    .readdirSync(OUTPUT_DIR)
    .filter((d) => fs.statSync(path.join(OUTPUT_DIR, d)).isDirectory());

  const links: string[] = [];
  for (const name of dirs) {
    const appDir = path.join(OUTPUT_DIR, name);
    // If the dir has App.js directly, link to it
    if (fs.existsSync(path.join(appDir, "index.html"))) {
      links.push(`      <a href="${name}/">${name}</a>`);
    } else {
      // Step-based app — link to each step
      const steps = fs
        .readdirSync(appDir)
        .filter((s) => fs.statSync(path.join(appDir, s)).isDirectory())
        .sort();
      if (steps.length > 0) {
        links.push(`      <div class="group"><strong>${name}</strong></div>`);
        for (const step of steps) {
          links.push(`      <a href="${name}/${step}/" class="step">${step}</a>`);
        }
      } else {
        links.push(`      <a href="${name}/">${name}</a>`);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Generated Apps</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 2rem; }
    a { display: block; padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 8px; background: #f1f5f9; color: #1e293b; text-decoration: none; }
    a:hover { background: #e2e8f0; }
    .group { padding: 0.75rem 1rem 0.25rem; margin-top: 1rem; font-size: 0.95rem; color: #475569; }
    .step { padding-left: 2rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Generated Apps</h1>
${links.join("\n")}
</body>
</html>`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html, "utf-8");
  console.log(`  Index written to ${path.relative(process.cwd(), OUTPUT_DIR)}/index.html`);
}
