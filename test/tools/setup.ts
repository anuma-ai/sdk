/**
 * Shared setup for tool e2e tests.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 *   E2E_MODEL        (optional)  Model to use (default: fireworks kimi-k2p5)
 *   E2E_API_TYPE     (optional)  "completions" or "responses" (default: completions)
 */

import "dotenv/config";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import type { ApiType } from "../../src/lib/chat/useChat/strategies/types.js";

export const config = {
  model: process.env.E2E_MODEL || "fireworks/accounts/fireworks/models/kimi-k2p5",
  apiType: (process.env.E2E_API_TYPE || "completions") as ApiType,
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

if (!config.portalKey) {
  throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
}

// ── Result helpers ───────────────────────────────────────────────────────────

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

export function printResult(result: Awaited<ReturnType<typeof runToolLoop>>) {
  if (result.error) {
    console.error("  ERROR:", result.error);
    if ("statusCode" in result) console.error("  Status:", result.statusCode);
    return;
  }
  const text = extractText(result);
  console.log("  Response:", (text || "(empty)").slice(0, 400));
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
