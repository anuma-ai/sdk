#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MANIFEST_NAME = "MEMORY_EXPORT_CONSUMERS.md";
const BARRELS = ["src/lib/memory/index.ts", "src/lib/memoryVault/index.ts"];
const STATUSES = new Set(["client-mounted", "public-utility", "dark"]);

const KNOB_PREFIX = "config:";
const RANKING_KNOBS = [
  {
    knob: "mmr",
    file: "src/lib/memoryVault/searchTool.ts",
    pattern: /if\s*\(\s*options\?\.mmr\s*\)/,
  },
  { knob: "graphRefine", file: "src/lib/memory/recall.ts", pattern: /options\.graphRefine\b/ },
  { knob: "subQueries", file: "src/lib/memory/recall.ts", pattern: /options\.subQueries\b/ },
  {
    knob: "rerank",
    file: "src/lib/memoryVault/searchTool.ts",
    pattern: /if\s*\(\s*options\?\.rerank\b/,
  },
];

const SPECIFIER = /\b(import|export)\s+(type\s+)?\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;

const codeOf = (file) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[^\n"'`]*\/\/.*$/gm, "");

function valueNames(block) {
  return block
    .split(",")
    .map((part) => part.trim())
    .filter((name) => name && !name.startsWith("type "))
    .map((name) => name.split(/\s+as\s+/)[0].trim());
}

function resolveModule(fromFile, spec) {
  const base = posix.join(posix.dirname(fromFile), spec.replace(/\.js$/, ""));
  const resolved = [`${base}.ts`, `${base}/index.ts`].find((c) => existsSync(join(ROOT, c)));
  if (!resolved) {
    console.error(`✖ ${fromFile} re-exports "${spec}", which resolves to no file.`);
    process.exit(1);
  }
  return resolved;
}

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
    if (keyword !== "export" || typeOnly) continue;
    if (/\s+as\s+/.test(block)) {
      bail("export { x as y }", "re-export under the defining module's own name.");
    }
    for (const name of valueNames(block)) {
      if (/^[A-Z0-9_]+$/.test(name)) continue;
      byName.set(name, resolveModule(file, spec));
    }
  }
  return byName;
}

/** @type {Map<string, string>} public export name → defining module */
const definedIn = new Map();
for (const barrel of BARRELS) for (const [n, m] of readBarrel(barrel)) definedIn.set(n, m);

const sources = readdirSync(join(ROOT, "src"), { recursive: true })
  .map((entry) => `src/${entry}`.replaceAll("\\", "/"))
  .filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.endsWith("/index.ts"));
/** @type {Map<string, Set<string>>} public export name → files importing it */
const importers = new Map();
for (const file of sources) {
  for (const [, , typeOnly, block, spec] of codeOf(file).matchAll(SPECIFIER)) {
    if (!spec.startsWith(".")) continue;
    if (typeOnly) continue;
    for (const name of valueNames(block)) {
      if (!definedIn.has(name)) continue;
      if (!importers.has(name)) importers.set(name, new Set());
      importers.get(name).add(file);
    }
  }
}

let manifest;
try {
  manifest = readFileSync(join(ROOT, MANIFEST_NAME), "utf8");
} catch {
  console.error(`✖ missing ${MANIFEST_NAME} — the export-consumer manifest.`);
  process.exit(1);
}

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
  if (name.startsWith(KNOB_PREFIX)) declaredKnobs.set(name.slice(KNOB_PREFIX.length), status);
  else declared.set(name, status);
}

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

const renamedKnobs = RANKING_KNOBS.filter(({ file, pattern }) => {
  if (!existsSync(join(ROOT, file))) return true;
  return !pattern.test(codeOf(file));
}).map(({ knob, file, pattern }) => `${knob}  (no match for ${pattern} in ${file})`);

const expectedKnobs = [...budgetTiers, ...RANKING_KNOBS.map((k) => k.knob)];

const isMemoryLayer = (f) =>
  f.startsWith("src/lib/memory/") || f.startsWith("src/lib/memoryVault/");
const live = new Set(sources.filter((f) => !isMemoryLayer(f)));
for (const [name, status] of declared) {
  const module = definedIn.get(name);
  if (status === "client-mounted" && module) live.add(module);
}
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

const leaves = [...definedIn.keys()].filter((name) => !consumedByLive(name)).sort();

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
