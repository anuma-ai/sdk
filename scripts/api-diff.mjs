import fs from "node:fs";
import path from "node:path";

const oldDir = process.argv[2];
const newDir = process.argv[3];

if (!oldDir || !newDir) {
  console.error("Usage: node api-diff.mjs <old-dir> <new-dir>");
  process.exit(1);
}

function getSignature(member) {
  return member.excerptTokens.map((t) => t.text).join("");
}

function extractMembers(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const entryPoint = data.members?.[0];
  if (!entryPoint?.members) return new Map();

  const map = new Map();
  for (const member of entryPoint.members) {
    map.set(member.name, {
      kind: member.kind,
      signature: getSignature(member),
    });
  }
  return map;
}

function labelForKind(kind) {
  const labels = {
    Function: "function",
    Interface: "interface",
    TypeAlias: "type",
    Variable: "variable",
    Enum: "enum",
    Class: "class",
    Namespace: "namespace",
  };
  return labels[kind] || kind.toLowerCase();
}

const oldFiles = fs
  .readdirSync(oldDir)
  .filter((f) => f.endsWith(".api.json"));
const newFiles = fs
  .readdirSync(newDir)
  .filter((f) => f.endsWith(".api.json"));
const allFiles = [...new Set([...oldFiles, ...newFiles])].sort();

const sections = [];

for (const file of allFiles) {
  const entryPoint = file.replace(".api.json", "").replace("reverbia-sdk", "");
  const label =
    entryPoint === ""
      ? "@reverbia/sdk"
      : `@reverbia/sdk/${entryPoint.slice(1)}`;

  const oldMembers = extractMembers(path.join(oldDir, file));
  const newMembers = extractMembers(path.join(newDir, file));

  const added = [];
  const removed = [];
  const modified = [];

  for (const [name, info] of newMembers) {
    if (!oldMembers.has(name)) {
      added.push({ name, ...info });
    } else if (oldMembers.get(name).signature !== info.signature) {
      modified.push({
        name,
        kind: info.kind,
        oldSignature: oldMembers.get(name).signature,
        newSignature: info.signature,
      });
    }
  }

  for (const [name, info] of oldMembers) {
    if (!newMembers.has(name)) {
      removed.push({ name, ...info });
    }
  }

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    continue;
  }

  const lines = [`#### \`${label}\``];

  if (added.length > 0) {
    lines.push("");
    lines.push("🆕 **Added**");
    const items = added.map(
      (m) => `\`${m.name}\` (${labelForKind(m.kind)})`
    );
    lines.push(items.join(" · "));
  }

  if (removed.length > 0) {
    lines.push("");
    lines.push("❌ **Removed**");
    const items = removed.map(
      (m) => `\`${m.name}\` (${labelForKind(m.kind)})`
    );
    lines.push(items.join(" · "));
  }

  if (modified.length > 0) {
    lines.push("");
    lines.push("✏️ **Modified**");
    for (const m of modified) {
      lines.push("");
      lines.push(
        `<details>\n<summary><code>${m.name}</code> (${labelForKind(m.kind)})</summary>\n`
      );
      lines.push("```diff");
      for (const line of m.oldSignature.split("\n")) {
        lines.push(`- ${line}`);
      }
      for (const line of m.newSignature.split("\n")) {
        lines.push(`+ ${line}`);
      }
      lines.push("```");
      lines.push("\n</details>");
    }
  }

  sections.push(lines.join("\n"));
}

if (sections.length === 0) {
  process.exit(0);
}

console.log(sections.join("\n\n---\n\n"));
