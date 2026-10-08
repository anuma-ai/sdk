import "dotenv/config";
import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import { beforeEach, expect } from "vitest";
import {
  runToolLoop as realRunToolLoop,
  type StepFinishEvent,
} from "../../src/lib/chat/toolLoop.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import type { ApiType } from "../../src/lib/chat/useChat/strategies/types.js";
import { record, type RecordedStep } from "./recorder.js";

export const config = {
  model: process.env.E2E_MODEL || "openai/gpt-6-luna",
  apiType: (process.env.E2E_API_TYPE || "auto") as ApiType,
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

export function requirePortalKey(): void {
  if (!config.portalKey) {
    throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
  }
}

if (config.portalKey) {
  console.log(`[e2e] model: ${config.model}, apiType: ${config.apiType}`);
}

export function extractText(result: Awaited<ReturnType<typeof realRunToolLoop>>): string {
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

export function printResult(result: Awaited<ReturnType<typeof realRunToolLoop>>) {
  if (result.error) {
    console.error("  ERROR:", result.error);
    if ("statusCode" in result) console.error("  Status:", result.statusCode);
    return;
  }
  const text = extractText(result);
  console.log("  Response:", (text || "(empty)").slice(0, 400));
}

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

const currentTest = new AsyncLocalStorage<{ name: string; signal: AbortSignal }>();

beforeEach((ctx) => {
  currentTest.enterWith({ name: ctx.task.fullTestName ?? ctx.task.name, signal: ctx.signal });
});

export async function runToolLoop(
  params: Parameters<typeof realRunToolLoop>[0]
): Promise<Awaited<ReturnType<typeof realRunToolLoop>>> {
  const start = performance.now();
  let lastTs = start;
  const steps: RecordedStep[] = [];
  const userOnStepFinish = params.onStepFinish;
  const testContext = currentTest.getStore();

  const result = await realRunToolLoop({
    ...params,
    maxOutputTokens: params.maxOutputTokens ?? 32000,
    signal: params.signal ?? testContext?.signal,
    onStepFinish: (event: StepFinishEvent) => {
      const now = performance.now();
      steps.push({
        stepIndex: event.stepIndex,
        content: event.content,
        toolCalls: event.toolCalls.map((tc) => ({
          name: tc.name,
          arguments: tc.arguments,
        })),
        toolResults: event.toolResults.map((tr) => ({
          name: tr.name,
          result: tr.result,
          ...(tr.error ? { error: tr.error } : {}),
          ...(tr.errorType ? { errorType: tr.errorType } : {}),
        })),
        usage: event.usage,
        latencyMs: now - lastTs,
      });
      lastTs = now;
      userOnStepFinish?.(event);
    },
  });

  const latencyMs = performance.now() - start;
  const testName = testContext?.name ?? expect.getState().currentTestName ?? "unknown";
  const toolsRegistered = (params.tools ?? []).map(
    (t: any) => t?.function?.name ?? t?.name ?? "unknown"
  );

  await record({
    ts: new Date().toISOString(),
    test: testName,
    model: params.model ?? "unknown",
    apiType: params.apiType ?? "auto",
    toolsRegistered,
    latencyMs,
    steps,
    finalText: extractText(result),
    error: result.error ?? null,
    finishReason:
      ("terminalState" in result ? result.terminalState?.finishReason : undefined) ?? null,
    finalToolCallCount:
      ("terminalState" in result ? result.terminalState?.finalToolCallCount : undefined) ?? null,
  });

  return result;
}
