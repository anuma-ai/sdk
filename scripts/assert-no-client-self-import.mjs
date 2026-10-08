#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

if (!existsSync(DIST)) {
  console.error(`✖ ${DIST} does not exist — run \`pnpm build\` before this check.`);
  process.exit(1);
}

const SELF_IMPORT = /(?:\bfrom|\brequire\()\s*["']@anuma\/sdk(?:\/[^"']*)?["']/;

function collectRuntimeFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...collectRuntimeFiles(full));
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
