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

/**
 * Time-boxed exceptions for advisories that have NO installable fix.
 *
 * Reach for this only when a `pnpm.overrides` entry can't resolve the finding —
 * an override is always the better answer, and the audit reads pnpm's resolved
 * tree so overrides are honored automatically. Every entry must carry the
 * evidence for why an override is impossible plus an `expires` date; the audit
 * FAILS on an expired entry, so an exception can't quietly become permanent.
 *
 * Fields: `id` (GHSA), `package`, `reason`, `expires` (YYYY-MM-DD, UTC).
 */
const ALLOWLIST = [
  // image-size DoS pair, published 2026-06-10 and picked up by npm's bulk
  // endpoint on 2026-08-10 — which is why a run that passed on 2026-08-07
  // started failing on main with no change to the lockfile.
  //
  // NO OVERRIDE IS POSSIBLE. Both advisories cover `<= 2.0.2` and report
  // `first_patched_version: null`; 2.0.2 is the newest version published, so
  // there is no version to pin to. Re-check with:
  //   gh api /advisories/GHSA-w3rx-r6r6-pgpr --jq '.vulnerabilities[].first_patched_version'
  //
  // Reachability is bundler-only: `image-size@1.2.1` arrives via
  // react-native -> @react-native/community-cli-plugin -> metro, i.e. the RN
  // dev server and bundler. The SDK never imports it and it is not part of any
  // shipped bundle; `pnpm list --prod` cannot tell that apart from runtime code,
  // which is what puts it in front of this audit at all. The DoS is a parser
  // infinite loop on hostile ICNS/JXL/HEIF input — reachable only by someone
  // feeding malicious images to their own build.
  //
  // Exit condition: image-size publishes a fix (then delete this and let the
  // resolved tree pick it up, or add a pnpm.overrides pin), or metro stops
  // depending on it. Either way this entry should be REMOVED, not extended —
  // the audit reports an entry that matches nothing, which is the signal.
  {
    id: "GHSA-w3rx-r6r6-pgpr",
    package: "image-size",
    reason:
      "ICNS parser DoS. No patched version exists (advisory range <= 2.0.2, first_patched_version null, 2.0.2 is latest published), so pnpm.overrides cannot resolve it. Reachable only via react-native -> community-cli-plugin -> metro (build-time bundler), never in a shipped bundle.",
    expires: "2026-11-10",
  },
  {
    id: "GHSA-5p2g-fcmc-qvqq",
    package: "image-size",
    reason:
      "JXL/HEIF parser DoS in the same package and version as GHSA-w3rx-r6r6-pgpr; identical no-fix and build-time-only reachability evidence.",
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

/**
 * The bulk endpoint keys advisories by npm's numeric id and carries the GHSA
 * only inside `url` (and sometimes `github_advisory_id`), so match on either.
 * Scoped by package name too — one GHSA must never excuse a different package.
 */
function matches(entry, finding) {
  if (entry.package !== finding.pkg) return false;
  return finding.github_advisory_id === entry.id || String(finding.url ?? "").includes(entry.id);
}

/**
 * Split findings into suppressed and reportable, and surface allowlist hygiene:
 * an EXPIRED entry stops suppressing (so its finding fails the build), and an
 * entry that matched nothing is reported as removable.
 */
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
// UTC, so a run's verdict never depends on the runner's timezone.
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
