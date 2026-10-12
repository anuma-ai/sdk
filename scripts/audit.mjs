import { execFileSync } from "node:child_process";

const SEVERITY_THRESHOLD = new Set(["high", "critical"]);
const BULK_ENDPOINT = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

const ALLOWLIST = [
  {
    id: "GHSA-w3rx-r6r6-pgpr",
    package: "image-size",
    reason:
      "ICNS parser DoS. Only fixed in image-size 2.0.3; no patched 1.x, and metro 0.83 (react-native 0.82) calls the v1 path-string API that v2 removed, so a pnpm.overrides pin breaks metro. Reachable only via react-native -> community-cli-plugin -> metro (build-time bundler), never in a shipped bundle.",
    expires: "2026-11-10",
  },
  {
    id: "GHSA-5p2g-fcmc-qvqq",
    package: "image-size",
    reason:
      "JXL/HEIF parser DoS in the same package and version as GHSA-w3rx-r6r6-pgpr; identical v1-only-compatible and build-time-only reachability evidence.",
    expires: "2026-11-10",
  },
  {
    id: "GHSA-vfj7-8cjw-p6xm",
    package: "braces",
    reason:
      "Stack-exhaustion DoS on deeply nested patterns. No patched release exists (advisory covers <= 3.0.3, the latest). Reachable only via react-native's metro bundler and jest tooling (micromatch), never imported by the SDK or in a shipped bundle.",
    expires: "2026-11-10",
  },
];

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

function matches(entry, finding) {
  if (entry.package !== finding.pkg) return false;
  return finding.github_advisory_id === entry.id || String(finding.url ?? "").includes(entry.id);
}

function applyAllowlist(findings, today) {
  const expired = ALLOWLIST.filter((entry) => entry.expires < today);
  const usable = ALLOWLIST.filter((entry) => entry.expires >= today);
  const suppressed = [];
  const reportable = [];
  const matched = new Set();

  for (const finding of findings) {
    const entry = usable.find((candidate) => matches(candidate, finding));
    if (entry) {
      matched.add(entry.id);
      suppressed.push({ finding, entry });
    } else {
      reportable.push(finding);
    }
  }
  const stale = usable.filter((entry) => !matched.has(entry.id));
  return { suppressed, reportable, expired, stale };
}

const packages = collectPackages();
console.log(`Auditing ${packages.size} production packages...`);
const advisories = await fetchAdvisories(packages);
const findings = filterByThreshold(advisories);
const today = new Date().toISOString().slice(0, 10);
const { suppressed, reportable, expired, stale } = applyAllowlist(findings, today);

for (const { finding, entry } of suppressed) {
  console.log(
    `\nAllowlisted until ${entry.expires}: [${finding.severity.toUpperCase()}] ${finding.pkg} — ${finding.title}`
  );
  console.log(`  ${finding.url}`);
  console.log(`  Reason: ${entry.reason}`);
}
for (const entry of stale) {
  console.log(
    `\nAllowlist entry for ${entry.package} (${entry.id}) matched no finding — safe to remove.`
  );
}
for (const entry of expired) {
  console.error(
    `\nAllowlist entry for ${entry.package} (${entry.id}) EXPIRED on ${entry.expires} — re-check for a fix, then update or remove the entry.`
  );
}

if (reportable.length > 0) {
  console.error(
    `\nFound ${reportable.length} unaddressed high/critical vulnerabilit${reportable.length === 1 ? "y" : "ies"} in production dependencies:\n`
  );
  for (const f of reportable) {
    console.error(`  [${f.severity.toUpperCase()}] ${f.pkg} — ${f.title}`);
    console.error(`    ${f.url}`);
    console.error(`    Affected: ${f.vulnerable_versions}\n`);
  }
}

if (reportable.length > 0 || expired.length > 0) {
  process.exit(1);
}
console.log("\nNo unaddressed high or critical vulnerabilities in production dependencies.");
process.exit(0);
