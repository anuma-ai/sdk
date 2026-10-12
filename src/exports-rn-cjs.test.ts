import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  exports: Record<string, Record<string, string>>;
};

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
