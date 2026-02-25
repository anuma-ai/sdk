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

  // Collect foreign key columns (only belongs_to side — the column that references another table)
  const foreignKeys = new Set<string>();
  for (const ModelClass of sdkModelClasses) {
    const model = ModelClass as any;
    const tableName: string = model.table;
    const associations: Record<string, { type: string; key?: string; foreignKey?: string }> =
      model.associations ?? {};

    for (const assoc of Object.values(associations)) {
      if (assoc.type === "belongs_to" && assoc.key) {
        foreignKeys.add(`${tableName}.${assoc.key}`);
      }
    }
  }

  const tables = Object.values(sdkSchema.tables) as any[];

  // Collect tables that participate in relationships
  const relatedTables = new Set<string>();
  for (const ModelClass of sdkModelClasses) {
    const model = ModelClass as any;
    const associations: Record<string, { type: string }> = model.associations ?? {};
    if (Object.keys(associations).length > 0) {
      relatedTables.add(model.table);
      for (const targetTable of Object.keys(associations)) {
        relatedTables.add(targetTable);
      }
    }
  }

  // Emit only tables that have relationships, with key columns only
  for (const table of tables) {
    if (!relatedTables.has(table.name)) continue;

    const keyCols = (table.columnArray as any[]).filter(
      (col: any) =>
        col.name.endsWith("_id") ||
        col.name === "wallet_address" ||
        foreignKeys.has(`${table.name}.${col.name}`)
    );

    lines.push(`    ${table.name} {`);
    for (const col of keyCols) {
      const marker = foreignKeys.has(`${table.name}.${col.name}`) ? " FK" : "";
      lines.push(`        ${col.type} ${col.name}${marker}`);
    }
    lines.push("    }");
  }

  // Emit relationships from model associations
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
    const anchor = table.name.toLowerCase().replace(/_/g, "-");
    lines.push(`- [\`${table.name}\`](#${anchor})`);
  }
  lines.push("");

  // Per-table sections
  for (const table of tables) {
    lines.push(`## \`${table.name}\`\n`);

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
