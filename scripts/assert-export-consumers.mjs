#!/usr/bin/env node
/**
 * "Shipped but unmounted" gate for the memory layer (#768 C4).
 *
 * From inside this repo, a public export with no caller is indistinguishable
 * from one a client calls — which is how a durable extraction cursor, an
 * injection classifier and `synthesizeProfile` all shipped and stayed dark.
 * knip can't help: an entry-point re-export is knip's definition of used.
 *
 * So this computes what it can (which memory exports the SDK itself consumes,
 * to a fixpoint) and makes a human declare the rest in
 * `MEMORY_EXPORT_CONSUMERS.md` — see that file for the semantics, and the
 * error messages below for what a failure is asking you to do.
 *
 * Known blind spot: only static named `import`/`export … from` specifiers count
 * as consumption. An export reached solely through `await import()` reads as
 * dark, so it needs a manifest row like any other.
 *
 * Run: `pnpm check:export-consumers` (part of `pnpm check`).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
// Repo root, NOT docs/ — `pnpm docs` (typedoc) cleans that directory.
const MANIFEST = join(ROOT, "MEMORY_EXPORT_CONSUMERS.md");
const BARRELS = ["src/lib/memory/index.ts", "src/lib/memoryVault/index.ts"];
// Semantics: MEMORY_EXPORT_CONSUMERS.md. Only `client-mounted` changes
// behavior here — it seeds liveness (see the fixpoint below).
const STATUSES = new Set(["client-mounted", "public-utility", "dark"]);

/** Named specifiers of every `import {…} from "…"` / `export {…} from "…"`. */
const SPECIFIER = /\b(import|export)\s+(type\s+)?\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;

/**
 * Source with comments stripped. Both barrels carry `@example` blocks with real
 * import statements in them, and a commented-out import would otherwise read as
 * live consumption.
 */
const codeOf = (file) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[^\n"'`]*\/\/.*$/gm, "");

/** `{ a, type B, c as d }` → the value names (`a`, `d`'s source `c`). */
function valueNames(block) {
  const names = [];
  for (const part of block.split(",")) {
    const name = part.trim();
    if (!name || name.startsWith("type ")) continue;
    names.push(name.split(/\s+as\s+/)[0].trim());
  }
  return names;
}

/** `src/lib/memory/index.ts` + `./reflect.js` → `src/lib/memory/reflect.ts`. */
function resolveModule(fromFile, spec) {
  const parts = `${fromFile.slice(0, fromFile.lastIndexOf("/"))}/${spec.replace(/\.js$/, "")}`
    .split("/")
    .reduce((out, part) => {
      if (part === "..") out.pop();
      else if (part !== ".") out.push(part);
      return out;
    }, []);
  const base = parts.join("/");
  // A barrel that re-exports a directory resolves to its index; anything else is
  // a wrong answer that would silently mis-seed liveness, so assert it exists.
  const resolved = existsSync(join(ROOT, `${base}.ts`)) ? `${base}.ts` : `${base}/index.ts`;
  if (!existsSync(join(ROOT, resolved))) {
    console.error(`✖ ${fromFile} re-exports "${spec}", which resolves to no file.`);
    process.exit(1);
  }
  return resolved;
}

/** Value exports of a barrel, keyed to their defining module. */
function readBarrel(file) {
  const src = codeOf(file);
  if (/export\s+\*\s+from/.test(src)) {
    console.error(
      `✖ ${file} uses \`export * from\`, which this gate cannot enumerate — ` +
        `list the names explicitly so a new export can't slip past undeclared.`
    );
    process.exit(1);
  }
  const byName = new Map();
  for (const [, keyword, typeOnly, block, spec] of src.matchAll(SPECIFIER)) {
    if (keyword !== "export" || typeOnly) continue; // types can't be "mounted"
    for (const name of valueNames(block)) {
      // Tuning constants are configuration, not a feature that can go dark.
      if (/^[A-Z0-9_]+$/.test(name)) continue;
      byName.set(name, resolveModule(file, spec));
    }
  }
  return byName;
}

// --- 1. the tracked surface -------------------------------------------------
/** @type {Map<string, string>} export name → defining module */
const definedIn = new Map();
for (const barrel of BARRELS) for (const [n, m] of readBarrel(barrel)) definedIn.set(n, m);

// --- 2. who imports what ----------------------------------------------------
// A consumer is a real module: barrels only forward, and tests prove behavior,
// not that anything ships calling it.
const sources = readdirSync(join(ROOT, "src"), { recursive: true })
  .map((entry) => `src/${entry}`.replaceAll("\\", "/"))
  .filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.endsWith("/index.ts"));
/** @type {Map<string, Set<string>>} export name → files importing it */
const importers = new Map();
for (const file of sources) {
  for (const [, , , block, spec] of codeOf(file).matchAll(SPECIFIER)) {
    if (!spec.startsWith(".")) continue; // package imports can't reach our own exports
    for (const name of valueNames(block)) {
      if (!definedIn.has(name)) continue;
      if (!importers.has(name)) importers.set(name, new Set());
      importers.get(name).add(file);
    }
  }
}

// --- 3. the declaration -----------------------------------------------------
let manifest;
try {
  manifest = readFileSync(MANIFEST, "utf8");
} catch {
  console.error(`✖ missing ${relative(ROOT, MANIFEST)} — the export-consumer manifest.`);
  process.exit(1);
}

/** @type {Map<string, {status: string, note: string}>} */
const declared = new Map();
const malformed = [];
for (const [, name, statusCell, noteCell] of manifest.matchAll(
  /^\|\s*`([^`\n]+)`\s*\|([^|\n]*)\|([^|\n]*)\|/gm
)) {
  const status = statusCell.trim().replace(/`/g, "");
  if (!STATUSES.has(status)) malformed.push(`${name} (status "${status}")`);
  declared.set(name, { status, note: noteCell.trim() });
}

// --- 4. fixpoint: consumption by a dark module doesn't count -----------------
// Seed: everything outside the memory layer is live SDK code (hooks, tools, the
// chat path), plus the modules behind exports a client is declared to mount.
// Then a memory-layer module becomes live once a live module imports one of its
// exports, which can make further modules live — iterate until stable. Without
// the iteration, `reflect` would read as live because `synthesizeProfile` calls
// it, even though nothing calls `synthesizeProfile`.
//
// The client seed keeps this honest in both directions: declaring
// `createDecaySweeper` client-mounted lets its private helpers out of the
// report, and removing that declaration brings the whole sweeper subtree back.
const isMemoryLayer = (f) =>
  f.startsWith("src/lib/memory/") || f.startsWith("src/lib/memoryVault/");
const live = new Set(sources.filter((f) => !isMemoryLayer(f)));
for (const [name, { status }] of declared) {
  const module = definedIn.get(name);
  if (status === "client-mounted" && module) live.add(module);
}
for (let changed = true; changed; ) {
  changed = false;
  for (const [name, files] of importers) {
    const module = definedIn.get(name);
    if (!module || live.has(module)) continue;
    // Self-imports don't make a module live (a module always "uses" itself).
    if ([...files].some((f) => live.has(f) && f !== module)) {
      live.add(module);
      changed = true;
    }
  }
}

/** Exports whose only possible caller is a client app — invisible from here. */
const leaves = [...definedIn.keys()]
  .filter((name) => {
    const module = definedIn.get(name);
    return ![...(importers.get(name) ?? [])].some((f) => live.has(f) && f !== module);
  })
  .sort();

// --- 5. compare against the declaration ------------------------------------
const problems = [
  [
    leaves.filter((n) => !declared.has(n)).map((n) => `${n}  (${definedIn.get(n)})`),
    "memory export(s) have no consumer inside this repo and no entry in MEMORY_EXPORT_CONSUMERS.md.\n" +
      "  A client app may call them — or nothing may, which is how #768 C1–C3 shipped dark.\n" +
      "  Add a row declaring where each is mounted, or status `dark` with the reason + tracking issue:",
  ],
  [
    [...declared.keys()].filter((n) => !leaves.includes(n)),
    "manifest row(s) no longer describe a client-facing export (renamed, unexported, or now called inside the SDK) — remove them:",
  ],
  [malformed, `manifest row(s) carry an unknown status — use one of ${[...STATUSES].join(" | ")}:`],
];

if (problems.every(([items]) => items.length === 0)) {
  console.log(
    `✔ memory export consumers: ${leaves.length} client-facing export(s), all declared in MEMORY_EXPORT_CONSUMERS.md`
  );
  process.exit(0);
}
for (const [items, header] of problems) {
  if (items.length === 0) continue;
  console.error(`✖ ${items.length} ${header}`);
  for (const item of items) console.error(`    ${item}`);
}
process.exit(1);
