import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
