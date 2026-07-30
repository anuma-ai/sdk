#!/usr/bin/env node
/**
 * Expiry guard for `tsconfig.test.json`'s `exclude` list.
 *
 * That list carves a handful of test suites out of `typecheck:test` because open
 * PRs are mid-rewrite on the exact lines their fixes would touch. The carve-out
 * is correct while those PRs are in flight and silently wrong the moment they
 * land: a comment saying "delete these once #832 and #834 are in" enforces
 * nothing, and an excluded suite drifts with no signal — which is the same
 * silent non-enforcement the whole `tsconfig.test.json` change exists to end.
 *
 * So the exclusion has to expire on its own. This typechecks ONLY the excluded
 * files and fails when one of them comes back CLEAN, because a clean file is
 * proof its rewrite landed and its carve-out is now hiding a suite that could be
 * enforced. The failure names the file and tells you to delete the line.
 *
 * It deliberately does not check for a specific error count or message. The
 * point is not "these files have exactly 21 errors" — that would break on any
 * unrelated edit. The point is "an excluded file that no longer needs excluding
 * must not stay excluded."
 */
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { EXCLUDED_TEST_SUITES } from "./excluded-test-suites.mjs";

/**
 * Typecheck one file in isolation under the test config's compiler options.
 *
 * The generated config lives in the REPO ROOT, not a temp directory. `typeRoots`
 * and module resolution walk up from the config's own location, so a config in
 * `os.tmpdir()` cannot find `node_modules/@types` and every file — clean or not —
 * comes back with `TS2688: Cannot find type definition file for 'node'`. That
 * makes the guard answer "still broken" for everything and quietly stop guarding.
 */
function errorsFor(file) {
  const cfg = join(process.cwd(), `.tsconfig.excl-check.${process.pid}.json`);
  writeFileSync(
    cfg,
    JSON.stringify({ extends: "./tsconfig.test.json", include: [file], exclude: [] })
  );
  try {
    execFileSync("npx", ["tsc", "--noEmit", "-p", cfg], { stdio: "pipe" });
    return 0; // exit 0 = clean
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return (out.match(/error TS/g) ?? []).length || 1;
  } finally {
    rmSync(cfg, { force: true });
  }
}

const nowClean = EXCLUDED_TEST_SUITES.filter((f) => errorsFor(f) === 0);

if (nowClean.length > 0) {
  console.error(
    "These suites are excluded from `typecheck:test` but now typecheck cleanly.\n" +
      "The PR that was rewriting them has landed, so the carve-out is now hiding\n" +
      "a suite that could be enforced. Delete each from `exclude` in\n" +
      "tsconfig.test.json and from scripts/excluded-test-suites.mjs:\n" +
      nowClean.map((f) => `  - ${f}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `All ${EXCLUDED_TEST_SUITES.length} excluded suites still have type errors — ` +
    "the carve-out is still doing work."
);
