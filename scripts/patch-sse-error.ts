/**
 * Post-codegen patch: ensures serverSentEvents.gen.ts uses SseError from
 * src/lib/errors.ts instead of a plain Error or an inline class definition.
 *
 * Run automatically after `openapi-ts` via the `spec` npm script.
 * Idempotent — safe to run multiple times.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FILE = resolve(
  import.meta.dirname ?? __dirname,
  "../src/client/core/serverSentEvents.gen.ts"
);

let source = readFileSync(FILE, "utf-8");
let changed = false;

const IMPORT_LINE = `import { SseError } from '../../lib/errors';`;

// 1. Remove any inline SseError class definition the codegen may have added
const inlineClassRe = /^export class SseError extends Error \{[\s\S]*?^\}\n?/m;
if (inlineClassRe.test(source)) {
  source = source.replace(inlineClassRe, "");
  changed = true;
}

// 2. Ensure the import exists
if (!source.includes(IMPORT_LINE)) {
  // Insert after the last existing import block
  const lastImportIdx = source.lastIndexOf("import ");
  if (lastImportIdx !== -1) {
    const eol = source.indexOf("\n", lastImportIdx);
    source = source.slice(0, eol + 1) + "\n" + IMPORT_LINE + "\n" + source.slice(eol + 1);
  } else {
    source = IMPORT_LINE + "\n\n" + source;
  }
  changed = true;
}

// 3. Replace `throw new Error(...)` for "SSE failed" with `throw new SseError(...)`
// Codegen may format this across multiple lines, so use a multiline-aware regex.
const plainErrorRe =
  /throw\s+new\s+Error\(\s*`SSE failed: \$\{(\w+)\.status\}\s+\$\{\1\.statusText\}`[\s,]*\)/g;
const replacement = "throw new SseError($1.status, $1.statusText)";
const patched = source.replace(plainErrorRe, replacement);
if (patched !== source) {
  source = patched;
  changed = true;
}

if (changed) {
  writeFileSync(FILE, source);
  console.log("✔ patched serverSentEvents.gen.ts with SseError import");
} else {
  console.log("✔ serverSentEvents.gen.ts already patched");
}
