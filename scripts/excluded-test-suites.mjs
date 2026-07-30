/**
 * The test suites carved out of `typecheck:test`, and why.
 *
 * Kept here rather than parsed out of `tsconfig.test.json` because that file is
 * JSONC — it carries the comments that explain the design — and hand-rolling a
 * comment-stripping parser to read it back would be a second place for the two
 * to disagree. This list and the `exclude` array in `tsconfig.test.json` are
 * edited together; `assert-excluded-suites-still-fail.mjs` is what stops either
 * from outliving its reason.
 *
 * Delete an entry from BOTH places once its PR lands and its errors are fixed.
 * The guard will tell you when that is.
 */
export const EXCLUDED_TEST_SUITES = [
  // #832 — query decomposition out of recall()
  "src/lib/memory/recall.test.ts",
  "src/lib/memory/recallTool.test.ts",
  "src/lib/memoryVault/searchTool.test.ts",
  // #834 — tool-save via retain
  "src/lib/memory/retain.test.ts",
  "src/lib/memoryVault/tool.test.ts",
];
