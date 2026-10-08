#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { EXCLUDED_TEST_SUITES } from "./excluded-test-suites.mjs";

function errorsFor(file) {
  const cfg = join(process.cwd(), `.tsconfig.excl-check.${process.pid}.json`);
  writeFileSync(
    cfg,
    JSON.stringify({ extends: "./tsconfig.test.json", include: [file], exclude: [] })
  );
  try {
    execFileSync("npx", ["tsc", "--noEmit", "-p", cfg], { stdio: "pipe" });
    return 0;
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
