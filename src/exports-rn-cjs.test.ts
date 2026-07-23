import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression guard for the React-Native / Hermes CJS↔ESM interop crash.
 *
 * `@nozbe/watermelondb` is a peerDependency, so tsup leaves it as a bare
 * `import { Model } from "@nozbe/watermelondb"` in the ESM (.mjs) build. Under
 * Metro/Hermes, that named binding resolves to `undefined` at module-eval time,
 * so the top-level `class X extends Model` in our db models throws
 * `TypeError: undefined cannot be used as a constructor` at launch (after login,
 * when the model classes load). The CJS build uses `require(...).Model` and is
 * immune. Therefore every `react-native` export condition MUST point at a `.cjs`
 * build. See PR: fix(sdk): resolve React-Native to CJS to avoid Model interop crash.
 */
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  exports: Record<string, Record<string, string>>;
};

describe("react-native export conditions", () => {
  it("resolve to the CJS build, never ESM (Hermes interop breaks `class extends <externalCJS>`)", () => {
    const offenders = Object.entries(pkg.exports)
      .filter(([, cond]) => typeof cond === "object" && typeof cond["react-native"] === "string")
      .filter(([, cond]) => !cond["react-native"].endsWith(".cjs"))
      .map(([sub, cond]) => `${sub} -> ${cond["react-native"]}`);

    expect(offenders, `react-native conditions must be .cjs:\n${offenders.join("\n")}`).toEqual([]);
  });
});

// Only runs when dist/ is built (e.g. CI after `pnpm build`); skipped otherwise
// so a source-only `vitest run` stays green.
const expoCjs = join(process.cwd(), "dist/expo/index.cjs");
describe.skipIf(!existsSync(expoCjs))("expo CJS build", () => {
  it("defines model classes as real constructors (no undefined superclass)", () => {
    const require = createRequire(import.meta.url);
    const { sdkModelClasses } = require(expoCjs) as { sdkModelClasses: unknown[] };
    expect(sdkModelClasses.length).toBeGreaterThan(0);
    for (const ModelClass of sdkModelClasses) expect(typeof ModelClass).toBe("function");
  });
});
