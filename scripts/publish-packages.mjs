// Idempotent lockstep publisher, invoked by semantic-release's exec publishCmd.
//
// semantic-release creates and pushes the vX.Y.Z git tag BEFORE running the
// publish step (see semantic-release/index.js). If a publish fails partway, the
// tag is already ahead of npm and a plain workflow re-run will NOT re-publish
// (semantic-release sees the tag and reports "no relevant changes"). Recovery is
// therefore: delete the tag + GitHub Release, then re-run the workflow —
// semantic-release recomputes the same version and calls this script again. This
// script publishes only the packages whose exact version is missing from npm, so
// re-publishing is a safe no-op for anything already there and only the gap is
// filled.
//
// Usage: node scripts/publish-packages.mjs <version>
//   <version> is the bare semver (no `v` prefix), passed as ${nextRelease.version}.
//   All 5 packages are lockstepped to this one version.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2] ?? readJson(join(repoRoot, "package.json")).version;

if (!version) {
  console.error("publish-packages: no version given and none found in package.json");
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// True when <name>@<version> is already on the npm registry.
function isPublished(name) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out === version;
  } catch {
    // E404 (package or version absent) or any lookup error → treat as not published.
    return false;
  }
}

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });
}

// Root SDK: no workspace: deps, so plain `npm publish`.
const rootName = readJson(join(repoRoot, "package.json")).name;
if (isPublished(rootName)) {
  console.log(`✓ ${rootName}@${version} already on npm — skipping`);
} else {
  run("npm", ["publish", "--access", "public"]);
}

// Agent packages: carry `@anuma/sdk: workspace:*`, so publish via pnpm (which
// rewrites the workspace protocol to the concrete version at pack time).
const agentsDir = join(repoRoot, "packages", "agents");
for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(agentsDir, entry.name, "package.json");
  let name;
  try {
    name = readJson(pkgPath).name;
  } catch {
    continue; // no package.json in this dir
  }
  if (isPublished(name)) {
    console.log(`✓ ${name}@${version} already on npm — skipping`);
  } else {
    run("pnpm", ["--filter", name, "publish", "--access", "public", "--no-git-checks"]);
  }
}
