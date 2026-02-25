import { writeFileSync } from "fs";
import { join } from "path";
import {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
  SDK_SCHEMA_VERSION,
} from "../src/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeStep(step: any): string {
  switch (step.type) {
    case "create_table":
      return `Added \`${step.schema.name}\` table`;
    case "add_columns": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cols = step.columns.map((c: any) => `\`${c.name}\``).join(", ");
      return `Added ${cols} to \`${step.table}\``;
    }
    case "sql":
      return `\`${step.sql.trim()}\``;
    default:
      return "Schema change";
  }
}

function generateErDiagram(): string {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("erDiagram");

  const seen = new Set<string>();
  for (const ModelClass of sdkModelClasses) {
    const model = ModelClass as any;
    const tableName: string = model.table;
    const associations: Record<string, { type: string; key?: string; foreignKey?: string }> =
      model.associations ?? {};

    for (const [targetTable, assoc] of Object.entries(associations)) {
      const pair = [tableName, targetTable].sort().join(":");
      if (seen.has(pair)) continue;
      seen.add(pair);

      if (assoc.type === "has_many") {
        lines.push(`    ${tableName} ||--o{ ${targetTable} : ""`);
      } else if (assoc.type === "belongs_to") {
        lines.push(`    ${targetTable} ||--o{ ${tableName} : ""`);
      }
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function generate(): string {
  const lines: string[] = [];

  lines.push(`# Database Schema\n`);
  lines.push(`Current version: **v${SDK_SCHEMA_VERSION}**\n`);
  lines.push(generateErDiagram());
  lines.push("");

  const tables = Object.values(sdkSchema.tables) as any[];

  // Table of contents
  lines.push("## Tables\n");
  for (const table of tables) {
    lines.push(`- [${table.name}](#${table.name})`);
  }
  lines.push("");

  // Per-table sections
  for (const table of tables) {
    lines.push(`## ${table.name}\n`);

    lines.push("| Column | Type | Indexed | Optional |");
    lines.push("|--------|------|---------|----------|");

    for (const col of table.columnArray as any[]) {
      const indexed = col.isIndexed ? "✓" : "";
      const optional = col.isOptional ? "✓" : "";
      lines.push(`| \`${col.name}\` | ${col.type} | ${indexed} | ${optional} |`);
    }

    lines.push("");
  }

  // Migration history
  lines.push("## Migration History\n");
  lines.push("| Version | Changes |");
  lines.push("|---------|---------|");

  for (const migration of [...(sdkMigrations.sortedMigrations as any[])].reverse()) {
    const changes = (migration.steps as any[]).map((step: any) => describeStep(step)).join("; ");
    lines.push(`| v${migration.toVersion} | ${changes} |`);
  }

  lines.push("| v2 | Baseline — `history`, `conversations`, and `memories` tables |");

  lines.push("");

  return lines.join("\n");
}

const output = generate();
const outputPath = join(process.cwd(), "docs", "schema.md");
writeFileSync(outputPath, output);
console.log(`Written to ${outputPath}`);
