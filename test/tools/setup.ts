/**
 * Shared setup for tool e2e tests.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 *   E2E_MODEL        (optional)  Model to use (default: openai/gpt-6-luna)
 *   E2E_API_TYPE     (optional)  "completions" or "responses" (default: completions)
 */

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
  // gpt-6-luna is the client's SYSTEM_TEXT_MODEL and one of its picker models.
  // The previous default, deepinfra/moonshotai/Kimi-K2.6, is ~10x slower through
  // the dev portal: a one-tool weather call took 50-110s against 6-8s for luna
  // (measured 2026-09-25), so the generation tests hit their budgets before the
  // model finished (anuma-ai/sdk#962). Kimi still runs in the compat matrix
  // (workflow_dispatch with model=all).
  model: process.env.E2E_MODEL || "openai/gpt-6-luna",
  // Default to "auto" so the SDK picks the best endpoint per model
  // (responses vs. completions) via `resolveApiType`. Many models
  // (Gemini, DeepSeek, MiniMax M2.7) 500 on the completions endpoint.
  apiType: (process.env.E2E_API_TYPE || "auto") as ApiType,
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

/**
 * Throws if PORTAL_API_KEY isn't configured. Call this from tests that
 * actually make portal calls; pure helpers that just consume types or
 * file-store utilities can import from this module without needing the
 * key set — this keeps unit-mode tests (vitest.config.mts) loadable
 * even when running in an environment that hasn't provisioned the e2e
 * credentials.
 */
export function requirePortalKey(): void {
  if (!config.portalKey) {
    throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
  }
}

if (config.portalKey) {
  console.log(`[e2e] model: ${config.model}, apiType: ${config.apiType}`);
}

// ── Result helpers ───────────────────────────────────────────────────────────

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

// ── Per-test context ─────────────────────────────────────────────────────────

/**
 * The running test's name and abort signal, tracked per async context.
 *
 * `expect.getState().currentTestName` is global, so under `describe.concurrent`
 * it names whichever test started last. The generation suites run
 * concurrently, and without this their traces would carry the wrong test name.
 * The signal is aborted when vitest times the test out, so a timed-out loop
 * stops calling the portal instead of competing with the tests after it.
 */
const currentTest = new AsyncLocalStorage<{ name: string; signal: AbortSignal }>();

beforeEach((ctx) => {
  currentTest.enterWith({ name: ctx.task.fullTestName ?? ctx.task.name, signal: ctx.signal });
});

// ── Recording wrapper ────────────────────────────────────────────────────────

/**
 * Drop-in replacement for `runToolLoop` that appends one JSONL record per
 * invocation to `test/tools/.runs/`. Composes the caller's `onStepFinish`
 * (user callback still fires) and captures total + per-step wall-clock
 * latency. See [recorder.ts](./recorder.ts) for the record schema.
 */
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
    // What the web and mobile clients send on every chat turn (chatSend.ts,
    // ChatInput.tsx). With no cap the portal applies 4096, so a slide or an
    // App.js + App.css pair is cut off mid-argument, the call fails to parse or
    // lands truncated, and the model spends its rounds rewriting it.
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
    // Straight off the loop's own normalized terminal state — NOT re-derived from
    // the response shape. Neither shape can answer: the Responses API has no
    // field for a finish reason at all, and completions omits `tool_calls` when
    // there are none, so "no calls" is indistinguishable from "field absent".
    finishReason:
      ("terminalState" in result ? result.terminalState?.finishReason : undefined) ?? null,
    finalToolCallCount:
      ("terminalState" in result ? result.terminalState?.finalToolCallCount : undefined) ?? null,
  });

  return result;
}
