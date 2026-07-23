import { readFileSync } from "node:fs";
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
 * immune. Therefore every React-Native entrypoint MUST resolve to a `.cjs`
 * build. See PR: fix(sdk): resolve React-Native to CJS to avoid Model interop crash.
 */
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  exports: Record<string, Record<string, string>>;
};

// Entrypoints imported by React-Native consumers (ai-memoryless-client mobile).
// Each MUST declare a `react-native` condition pointing at CJS — a missing
// condition silently falls through to `import` → `.mjs` and reintroduces the crash.
const RN_ENTRYPOINTS = [".", "./expo", "./react", "./constants", "./polyfills", "./tools"];

describe("react-native export conditions", () => {
  it.each(RN_ENTRYPOINTS)("%s declares a react-native condition resolving to CJS", (sub) => {
    const cond = pkg.exports[sub];
    expect(cond, `"${sub}" is missing from exports`).toBeDefined();
    expect(cond["react-native"], `"${sub}" must declare a react-native condition`).toBeDefined();
    expect(cond["react-native"]).toMatch(/\.cjs$/);
  });

  it("never points ANY react-native condition at an ESM (.mjs) build", () => {
    const esm = Object.entries(pkg.exports)
      .filter(([, cond]) => typeof cond === "object" && typeof cond["react-native"] === "string")
      .filter(([, cond]) => !cond["react-native"].endsWith(".cjs"))
      .map(([sub, cond]) => `${sub} -> ${cond["react-native"]}`);

    expect(esm, `react-native conditions must be .cjs:\n${esm.join("\n")}`).toEqual([]);
  });
});
