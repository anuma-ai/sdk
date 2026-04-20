import { execFileSync } from "node:child_process";

// Audits production dependencies against npm's bulk advisory endpoint and
// fails the process if any high or critical vulnerability is found.
//
// Replaces `pnpm audit --prod --audit-level high`, which is broken on
// pnpm 10.x because npm retired the legacy audit endpoint (see pnpm/pnpm#11265).
//
// Using `pnpm list` as the source of truth means pnpm.overrides and
// pnpm.patchedDependencies are honored: we only audit what pnpm actually
// resolved and would install.

const SEVERITY_THRESHOLD = new Set(["high", "critical"]);
const BULK_ENDPOINT = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

function collectPackages() {
  const raw = execFileSync("pnpm", ["list", "--prod", "--depth", "Infinity", "--json"], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const roots = JSON.parse(raw);
  const packages = new Map();

  function walk(deps) {
    if (!deps) return;
    for (const [name, info] of Object.entries(deps)) {
      if (!info?.version) continue;
      if (!packages.has(name)) packages.set(name, new Set());
      packages.get(name).add(info.version);
      walk(info.dependencies);
    }
  }

  for (const root of roots) {
    walk(root.dependencies);
  }
  return packages;
}

async function fetchAdvisories(packages) {
  const body = Object.fromEntries([...packages].map(([name, versions]) => [name, [...versions]]));
  const res = await fetch(BULK_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Bulk advisory endpoint returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function filterByThreshold(advisories) {
  const findings = [];
  for (const [pkg, list] of Object.entries(advisories)) {
    for (const advisory of list) {
      if (SEVERITY_THRESHOLD.has(advisory.severity)) {
        findings.push({ pkg, ...advisory });
      }
    }
  }
  return findings;
}

const packages = collectPackages();
console.log(`Auditing ${packages.size} production packages...`);
const advisories = await fetchAdvisories(packages);
const findings = filterByThreshold(advisories);

if (findings.length === 0) {
  console.log("No high or critical vulnerabilities in production dependencies.");
  process.exit(0);
}

console.error(
  `\nFound ${findings.length} high/critical vulnerabilit${findings.length === 1 ? "y" : "ies"} in production dependencies:\n`
);
for (const f of findings) {
  console.error(`  [${f.severity.toUpperCase()}] ${f.pkg} — ${f.title}`);
  console.error(`    ${f.url}`);
  console.error(`    Affected: ${f.vulnerable_versions}\n`);
}
process.exit(1);
