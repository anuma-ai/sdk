import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2] ?? readJson(join(repoRoot, "package.json")).version;
const tagArgs = process.argv[3] ? ["--tag", process.argv[3]] : [];

if (!version) {
  console.error("publish-packages: no version given and none found in package.json");
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isPublished(name) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out === version;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });
}

const rootName = readJson(join(repoRoot, "package.json")).name;
if (isPublished(rootName)) {
  console.log(`✓ ${rootName}@${version} already on npm — skipping`);
} else {
  run("npm", ["publish", "--access", "public", ...tagArgs]);
}

function publishWorkspacePackage(name) {
  const packDir = mkdtempSync(join(tmpdir(), "anuma-pack-"));
  run("pnpm", ["--filter", name, "pack", "--pack-destination", packDir]);
  const [tarball] = readdirSync(packDir).filter((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error(`pnpm pack produced no tarball for ${name}`);
  run("npm", ["publish", join(packDir, tarball), "--access", "public", ...tagArgs]);
}

const agentsDir = join(repoRoot, "packages", "agents");
for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(agentsDir, entry.name, "package.json");
  let name;
  try {
    name = readJson(pkgPath).name;
  } catch {
    continue;
  }
  if (isPublished(name)) {
    console.log(`✓ ${name}@${version} already on npm — skipping`);
  } else {
    publishWorkspacePackage(name);
  }
}
