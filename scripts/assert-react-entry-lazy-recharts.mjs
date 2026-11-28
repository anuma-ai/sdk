#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REACT_DIST = fileURLToPath(new URL("../dist/react/", import.meta.url));
const STATIC_RECHARTS = /(?:\bfrom\s*|\brequire\(\s*)["']recharts["']/;

const problems = [];
for (const extension of ["mjs", "cjs"]) {
  const entry = `index.${extension}`;
  const chart = `./chart/index.${extension}`;
  const code = readFileSync(`${REACT_DIST}${entry}`, "utf8");
  if (STATIC_RECHARTS.test(code)) {
    problems.push(`dist/react/${entry} imports recharts at load time`);
  }
  if (!code.includes(`import("${chart}")`) || !existsSync(`${REACT_DIST}${chart}`)) {
    problems.push(`dist/react/${entry} does not lazy-load ${chart}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✖ ${problem}`);
  console.error(
    "\nEvery app importing @anuma/sdk/react would ship recharts. Check the react-chart-subpath plugin in tsup.config.ts."
  );
  process.exit(1);
}

console.log("✓ @anuma/sdk/react loads recharts only through dist/react/chart");
