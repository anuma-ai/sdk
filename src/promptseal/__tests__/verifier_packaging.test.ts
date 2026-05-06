/**
 * Smoke test: the four verifier static files exist in the source tree
 * exactly where `scripts/promptseal-copy-verifier.mjs` expects them. After
 * `pnpm build`, they end up in `dist/promptseal/verifier/` (asserted in
 * the script itself), and `package.json#files` must list that path so they
 * land in the published tarball.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const VERIFIER_DIR = path.resolve(here, "..", "verifier");
const REQUIRED = ["index.html", "verify.js", "canonical.js", "style.css"];

describe("verifier packaging", () => {
  it.each(REQUIRED)("source verifier file %s exists", (file) => {
    expect(existsSync(path.join(VERIFIER_DIR, file))).toBe(true);
  });
});
