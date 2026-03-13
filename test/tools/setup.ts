/**
 * Shared setup for tool e2e tests.
 *
 * Parses CLI args, reads environment variables, and provides
 * helpers for printing results and running test suites.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import type { ApiType } from "../../src/lib/chat/useChat/strategies/types.js";

const { values: parsedArgs } = parseArgs({
  options: {
    model: { type: "string", default: "fireworks/accounts/fireworks/models/kimi-k2p5" },
    completions: { type: "boolean", default: true },
  },
});

export const config = {
  model: parsedArgs.model!,
  apiType: (parsedArgs.completions ? "completions" : "responses") as ApiType,
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

if (!config.portalKey) {
  console.error("PORTAL_API_KEY is required. Add it to .env or pass inline.");
  process.exit(1);
}

// ── Result helpers ───────────────────────────────────────────────────────────

export function header(label: string) {
  console.log(`\n${"─".repeat(60)}\n  ${label}\n${"─".repeat(60)}`);
}

export function extractText(result: Awaited<ReturnType<typeof runToolLoop>>): string {
  if (result.error) return "";
  if (!result.data) return "";
  if ("output" in result.data) {
    return (
      result.data.output
        ?.filter((o: any) => o.type === "message")
        .flatMap((o: any) => o.content)
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join("") || ""
    );
  }
  const content = (result.data as any).choices?.[0]?.message?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
  }
  return "";
}

export function printResult(result: Awaited<ReturnType<typeof runToolLoop>>): boolean {
  if (result.error) {
    console.error("  ERROR:", result.error);
    if ("statusCode" in result) console.error("  Status:", result.statusCode);
    return false;
  }
  const text = extractText(result);
  console.log("  Response:", (text || "(empty)").slice(0, 400));
  if ("autoExecutedToolResults" in result && result.autoExecutedToolResults?.length) {
    console.log(`  Auto-executed tools (${result.autoExecutedToolResults.length}):`);
    for (const t of result.autoExecutedToolResults) {
      const preview = JSON.stringify(t.result).slice(0, 150);
      console.log(`    - ${t.name}: ${preview}`);
    }
  }
  return true;
}

// ── Tool wrapping ────────────────────────────────────────────────────────────

export type ToolCallLog = { name: string; args: Record<string, unknown>; result: unknown };

export function wrapTool(tool: ToolConfig, log: ToolCallLog[]): ToolConfig {
  const originalExecutor = tool.executor!;
  const name = (tool as any).function.name;

  tool.executor = async (a: Record<string, unknown>) => {
    console.log(`  [executor] ${name} called: ${JSON.stringify(a)}`);
    const result = await originalExecutor(a);
    log.push({ name, args: a, result });
    return typeof result === "string" ? result : JSON.stringify(result);
  };

  return tool;
}

// ── Assertions ───────────────────────────────────────────────────────────────

export function assert(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message);
}

export function printAssertions(errors: string[], passes: string[]) {
  for (const e of errors) console.log(`  ✗ ${e}`);
  if (errors.length === 0) {
    for (const p of passes) console.log(`  ✓ ${p}`);
  }
}

// ── Test runner ──────────────────────────────────────────────────────────────

export type TestFn = () => Promise<boolean>;

export async function runTests(tests: Array<{ name: string; run: TestFn }>) {
  console.log(`Portal:  ${config.baseUrl}`);
  console.log(`Model:   ${config.model}`);
  console.log(`API:     ${config.apiType}`);

  const results: Array<{ name: string; ok: boolean }> = [];
  for (const t of tests) {
    results.push({ name: t.name, ok: await t.run() });
  }

  header("Summary");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll tests passed.");
}
