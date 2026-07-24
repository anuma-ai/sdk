#!/usr/bin/env node
/**
 * Regression guard for the Expo/React-Native startup crash fixed in PR #753.
 *
 * No shipped runtime bundle may import the package itself (`@anuma/sdk` or any
 * of its subpaths). When the expo/react/server/tools-selection builds
 * externalized the generated HTTP client to `@anuma/sdk`, the emitted chunk
 * self-imported the full root build; React Native / Hermes cannot load that
 * root bundle, so `import … from "@anuma/sdk/expo"` threw "undefined cannot be
 * used as a constructor" at module-eval and cascaded into every route failing
 * to load. The self-import lived in a `chunk-*.mjs`, not the entry — so this
 * scans every emitted `.mjs`/`.cjs` (both module formats), not just entries.
 *
 * Runs after `pnpm build` via `pnpm check-exports` (see .github/workflows/check-exports.yml).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

if (!existsSync(DIST)) {
  console.error(`✖ ${DIST} does not exist — run \`pnpm build\` before this check.`);
  process.exit(1);
}

// Matches `from "@anuma/sdk"`, `from '@anuma/sdk/expo'`, `require("@anuma/sdk")`, etc.
const SELF_IMPORT = /(?:\bfrom|\brequire\()\s*["']@anuma\/sdk(?:\/[^"']*)?["']/;

/** @param {string} dir @returns {string[]} */
function collectRuntimeFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...collectRuntimeFiles(full));
    // Runtime only. `.d.ts`/`.d.mts` legitimately reference `@anuma/sdk`
    // subpaths in type positions and must not be flagged.
    else if (/\.(mjs|cjs)$/.test(name)) files.push(full);
  }
  return files;
}

const files = collectRuntimeFiles(DIST);
const offenders = files.filter((file) => SELF_IMPORT.test(readFileSync(file, "utf8")));

if (offenders.length > 0) {
  console.error(
    `✖ ${offenders.length} shipped runtime bundle(s) self-import "@anuma/sdk" — this reintroduces the Expo/RN startup crash (PR #753):`
  );
  for (const file of offenders) console.error(`    dist/${file.slice(DIST.length)}`);
  console.error(
    "\nThe expo/react/server/tools-selection builds must BUNDLE the generated client, not externalize it to `@anuma/sdk`. Check tsup.config.ts for a re-added client-externalization plugin."
  );
  process.exit(1);
}

console.log(`✓ no @anuma/sdk self-imports across ${files.length} shipped runtime bundles`);
