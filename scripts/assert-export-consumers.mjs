#!/usr/bin/env node
/**
 * "Shipped but unmounted" gate for the memory layer (#768 C4). Computes which
 * memory-barrel value exports the SDK itself consumes, to a fixpoint, and makes
 * a human declare the rest. Why it exists and what the statuses mean:
 * MEMORY_EXPORT_CONSUMERS.md.
 *
 * Blind spot: only static named `import`/`export … from` specifiers count as
 * consumption, so an export reached solely through `await import()` reads as
 * dark and needs a row like any other.
 *
 * Run: `pnpm check:export-consumers` (part of `pnpm check`).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
// Repo root, NOT docs/ — `pnpm docs` (typedoc) cleans that directory.
const MANIFEST_NAME = "MEMORY_EXPORT_CONSUMERS.md";
const BARRELS = ["src/lib/memory/index.ts", "src/lib/memoryVault/index.ts"];
// Semantics: MEMORY_EXPORT_CONSUMERS.md. Only `client-mounted` changes
// behavior here — it seeds liveness (see the fixpoint below).
const STATUSES = new Set(["client-mounted", "public-utility", "dark"]);

/**
 * CONFIG-LEVEL reachability (#844 §4).
 *
 * The export gate below proves "some live module imports it", propagated to a
 * fixpoint. That is blind by construction to a symbol imported by a live module
 * and called from a branch no client configuration reaches — which is how
 * `budget: 'high'` (graph traversal, LLM decomposition, the neighbor refiner),
 * `options.mmr` and `nerDetector` all sat unreachable in production for months
 * while this script printed green.
 *
 * What this section can and cannot do, stated plainly so a green run isn't
 * over-read: this repo cannot see the client tree, so it CANNOT verify a call
 * site. It forces the same thing the export manifest forces one level up — a
 * human declaring, in a reviewed diff, whether each gating knob is reachable.
 * The teeth are that a NEW tier or a RENAMED knob fails immediately rather than
 * silently dropping out of coverage.
 *
 * (A real call-site check needs both trees at once. The natural home is
 * `.github/workflows/integration-check.yml`, which already clones the client —
 * noted in the manifest as the follow-up.)
 *
 * Each knob names the file and the source-level token where it is READ. The
 * token existing is asserted, so a rename can't quietly un-cover a knob.
 */
const KNOB_PREFIX = "config:";
const RANKING_KNOBS = [
  { knob: "mmr", file: "src/lib/memoryVault/searchTool.ts", token: "options.mmr" },
  { knob: "graphRefine", file: "src/lib/memory/recall.ts", token: "options.graphRefine" },
  { knob: "subQueries", file: "src/lib/memory/recall.ts", token: "subQueries" },
  { knob: "rerank", file: "src/lib/memoryVault/searchTool.ts", token: "rerank" },
];

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

/**
 * Value names in a `{…}` block. `as` is rejected in barrels (see readBarrel), so
 * on that path the name is unambiguous; on the consumer path the source side is
 * the one that identifies the export being used.
 */
function valueNames(block) {
  return block
    .split(",")
    .map((part) => part.trim())
    .filter((name) => name && !name.startsWith("type "))
    .map((name) => name.split(/\s+as\s+/)[0].trim());
}

/** `src/lib/memory/index.ts` + `./reflect.js` → `src/lib/memory/reflect.ts`. */
function resolveModule(fromFile, spec) {
  const base = posix.join(posix.dirname(fromFile), spec.replace(/\.js$/, ""));
  // A directory re-export resolves to its index. A wrong answer here would
  // silently mis-seed liveness, so fail loudly instead of guessing.
  const resolved = [`${base}.ts`, `${base}/index.ts`].find((c) => existsSync(join(ROOT, c)));
  if (!resolved) {
    console.error(`✖ ${fromFile} re-exports "${spec}", which resolves to no file.`);
    process.exit(1);
  }
  return resolved;
}

/** Public value exports of a barrel → the module that defines each. */
function readBarrel(file) {
  const src = codeOf(file);
  const bail = (what, fix) => {
    console.error(`✖ ${file} uses \`${what}\`, which this gate cannot follow — ${fix}`);
    process.exit(1);
  };
  if (/export\s+\*\s+from/.test(src)) {
    bail("export * from", "list the names explicitly so a new export can't slip past undeclared.");
  }
  const byName = new Map();
  for (const [, keyword, typeOnly, block, spec] of src.matchAll(SPECIFIER)) {
    if (keyword !== "export" || typeOnly) continue; // types can't be "mounted"
    // A renamed re-export has two names — the one consumers call and the one the
    // defining module uses — and tracking the wrong one would compare the
    // manifest against a name nothing can import. Neither barrel needs renames,
    // so reject rather than carry the ambiguity.
    if (/\s+as\s+/.test(block)) {
      bail("export { x as y }", "re-export under the defining module's own name.");
    }
    for (const name of valueNames(block)) {
      // Tuning constants are configuration, not a feature that can go dark.
      if (/^[A-Z0-9_]+$/.test(name)) continue;
      byName.set(name, resolveModule(file, spec));
    }
  }
  return byName;
}

// --- 1. the tracked surface -------------------------------------------------
/** @type {Map<string, string>} public export name → defining module */
const definedIn = new Map();
for (const barrel of BARRELS) for (const [n, m] of readBarrel(barrel)) definedIn.set(n, m);

// --- 2. who imports what ----------------------------------------------------
// A consumer is a real module: barrels only forward, and tests prove behavior,
// not that anything ships calling it.
const sources = readdirSync(join(ROOT, "src"), { recursive: true })
  .map((entry) => `src/${entry}`.replaceAll("\\", "/"))
  .filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.endsWith("/index.ts"));
/** @type {Map<string, Set<string>>} public export name → files importing it */
const importers = new Map();
for (const file of sources) {
  for (const [, , typeOnly, block, spec] of codeOf(file).matchAll(SPECIFIER)) {
    if (!spec.startsWith(".")) continue; // package imports can't reach our own exports
    // `import type {…}` is erased at build time, so it cannot call anything —
    // counting it as consumption would mark a module live (and hide its whole
    // dark subtree) on the strength of a type reference.
    if (typeOnly) continue;
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
  manifest = readFileSync(join(ROOT, MANIFEST_NAME), "utf8");
} catch {
  console.error(`✖ missing ${MANIFEST_NAME} — the export-consumer manifest.`);
  process.exit(1);
}

// The third `|` is load-bearing even though the note itself is never read: it
// requires three columns, which is what keeps the two-column status legend from
// parsing as declarations.
/** @type {Map<string, string>} export name → declared status */
const declared = new Map();
/** @type {Map<string, string>} config knob (sans prefix) → declared status */
const declaredKnobs = new Map();
const malformed = [];
for (const [, name, statusCell] of manifest.matchAll(
  /^\|\s*`([^`\n]+)`\s*\|([^|\n]*)\|([^|\n]*)\|/gm
)) {
  const status = statusCell.trim().replace(/`/g, "");
  if (!STATUSES.has(status)) malformed.push(`${name} (status "${status}")`);
  // `config:` rows describe a CONFIGURATION knob, not an export. Kept in the
  // same table syntax (so one parser serves both) but a separate map, or they
  // would trip the "no longer describes a client-facing export" check.
  if (name.startsWith(KNOB_PREFIX)) declaredKnobs.set(name.slice(KNOB_PREFIX.length), status);
  else declared.set(name, status);
}

// --- 3b. the config-level knobs (#844 §4) -----------------------------------
// Budget tiers are DERIVED from the type, not listed here: adding a tier must
// fail this gate until someone declares whether a client can select it. That is
// the whole lesson of `high`, which shipped as the only tier enabling traversal
// and was never selectable.
const budgetSrc = codeOf("src/lib/memory/types.ts");
const budgetDecl = /export\s+type\s+Budget\s*=\s*([^;]+);/.exec(budgetSrc);
const knobProblems = [];
if (!budgetDecl) {
  knobProblems.push([
    ["Budget"],
    "could not parse `export type Budget` from src/lib/memory/types.ts — the tier list is derived from it, so this gate is blind until the pattern is fixed:",
  ]);
}
const budgetTiers = budgetDecl
  ? [...budgetDecl[1].matchAll(/"([^"]+)"/g)].map((m) => `budget=${m[1]}`)
  : [];

// A knob whose read-site token vanished is a rename: the row still passes but
// covers nothing, so fail loudly instead.
const renamedKnobs = RANKING_KNOBS.filter(({ file, token }) => {
  if (!existsSync(join(ROOT, file))) return true;
  return !codeOf(file).includes(token);
}).map(({ knob, file, token }) => `${knob}  (expected \`${token}\` in ${file})`);

const expectedKnobs = [...budgetTiers, ...RANKING_KNOBS.map((k) => k.knob)];

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
for (const [name, status] of declared) {
  const module = definedIn.get(name);
  if (status === "client-mounted" && module) live.add(module);
}
/** Is `name` imported by a live module? Self-imports don't count — a module
 *  always "uses" itself. */
const consumedByLive = (name) =>
  [...(importers.get(name) ?? [])].some((f) => live.has(f) && f !== definedIn.get(name));

for (let changed = true; changed; ) {
  changed = false;
  for (const name of importers.keys()) {
    const module = definedIn.get(name);
    if (!module || live.has(module) || !consumedByLive(name)) continue;
    live.add(module);
    changed = true;
  }
}

/** Exports whose only possible caller is a client app — invisible from here. */
const leaves = [...definedIn.keys()].filter((name) => !consumedByLive(name)).sort();

// --- 5. compare against the declaration ------------------------------------
const problems = [
  [
    leaves.filter((n) => !declared.has(n)).map((n) => `${n}  (${definedIn.get(n)})`),
    `memory export(s) have no consumer inside this repo and no entry in ${MANIFEST_NAME}.\n` +
      "  A client app may call them — or nothing may, which is how #768 C1–C3 shipped dark.\n" +
      "  Add a row declaring where each is mounted, or status `dark` with the reason + tracking issue:",
  ],
  [
    [...declared.keys()].filter((n) => !leaves.includes(n)),
    "manifest row(s) no longer describe a client-facing export (renamed, unexported, or now called inside the SDK) — remove them:",
  ],
  [malformed, `manifest row(s) carry an unknown status — use one of ${[...STATUSES].join(" | ")}:`],
  ...knobProblems,
  [
    renamedKnobs,
    "config knob(s) no longer read where this gate expects, so their manifest row covers nothing.\n" +
      "  Update RANKING_KNOBS in this script to the new read site (a rename must not silently drop coverage):",
  ],
  [
    expectedKnobs.filter((k) => !declaredKnobs.has(k)).map((k) => `${KNOB_PREFIX}${k}`),
    `config knob(s) gate a ranking branch and have no entry in ${MANIFEST_NAME}.\n` +
      "  This gate cannot see the client tree, so it cannot prove a call site — declare whether one exists.\n" +
      "  `client-mounted` (the note names the client file), or `dark` with the reason + tracking issue:",
  ],
  [
    [...declaredKnobs.keys()]
      .filter((k) => !expectedKnobs.includes(k))
      .map((k) => `${KNOB_PREFIX}${k}`),
    "manifest row(s) declare a config knob this gate no longer knows about (removed tier, or dropped from RANKING_KNOBS) — remove them:",
  ],
];

let failed = false;
for (const [items, header] of problems) {
  if (items.length === 0) continue;
  failed = true;
  console.error(`✖ ${items.length} ${header}`);
  for (const item of items) console.error(`    ${item}`);
}
if (failed) process.exit(1);
console.log(
  `✔ memory export consumers: ${leaves.length} client-facing export(s), all declared in ${MANIFEST_NAME}`
);
