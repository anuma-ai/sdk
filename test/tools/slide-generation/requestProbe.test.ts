/**
 * Request-probe variant of the slide-generation e2e.
 *
 * Runs the same plan_slides → create_slides flow as
 * `slide-generation.test.ts`, but additionally captures `onRequest` events
 * to measure how many LLM round-trips happen, how much of each request body
 * is the (re-sent every round) tool catalog, and how the message history
 * grows. Prints a per-round table and aggregate redundancy stats.
 *
 * This is the realistic measurement behind the prompt-caching recommendation:
 * a multi-round generation flow with a non-trivial tool catalog and a real
 * system prompt.
 */

import { describe, expect, it } from "vitest";

import { buildSlideSystemPrompt } from "../../../src/tools/slides/index.js";
import type { RequestEvent } from "../../../src/lib/chat/toolLoop.js";
import {
  config,
  createFileStore,
  dumpFiles,
  printResult,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

describe("slide-generation request probe", () => {
  it("measures per-round payload sizes across a real slide-generation flow", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const requests: RequestEvent[] = [];

    const result = await timedToolLoop({
      messages: [
        { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Create a 3-slide presentation about the benefits of remote work.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
      onRequest: (event) => {
        requests.push(event);
      },
    });

    printResult(result);
    dumpFiles(store, "remote-work-deck-probe");
    expect(result.error).toBeNull();
    expect(requests.length).toBeGreaterThanOrEqual(2);

    const firstToolsBytes = requests[0].toolsBytes;
    const totalBytes = requests.reduce((s, r) => s + r.bodyBytes, 0);
    const totalToolsBytes = requests.reduce((s, r) => s + r.toolsBytes, 0);
    const totalMessagesBytes = requests.reduce((s, r) => s + r.messagesBytes, 0);
    const redundantToolsBytes = totalToolsBytes - firstToolsBytes;
    const redundantToolsPct = ((redundantToolsBytes / totalBytes) * 100).toFixed(1);

    // Prompt-caching simulation. Anthropic-style caching with a breakpoint at
    // the end of each round's prompt prefix (tools + messages) means every
    // subsequent round can hit the cache for the full prior-round prefix.
    // Billable input bytes per round ≈ (cur tools + cur messages) − (prev
    // tools + prev messages). Round 0 has no cache to hit. This is what
    // would actually be charged as fresh input tokens with caching enabled.
    let cachedBillable = requests[0].messagesBytes + requests[0].toolsBytes;
    for (let i = 1; i < requests.length; i++) {
      const cur = requests[i].messagesBytes + requests[i].toolsBytes;
      const prev = requests[i - 1].messagesBytes + requests[i - 1].toolsBytes;
      cachedBillable += Math.max(0, cur - prev);
    }
    const uncachedBillable = requests.reduce((s, r) => s + r.messagesBytes + r.toolsBytes, 0);
    const cacheSavingsBytes = uncachedBillable - cachedBillable;
    const cacheSavingsPct = ((cacheSavingsBytes / uncachedBillable) * 100).toFixed(1);

    console.log("\n  Per-round request payload:");
    console.log("  round | msgs |  tools |        body |    messages |       tools");
    console.log("  ------+------+--------+-------------+-------------+------------");
    for (const r of requests) {
      const round = String(r.round).padStart(5);
      const msgs = String(r.messageCount).padStart(4);
      const toolsN = String(r.toolCount).padStart(6);
      const body = formatBytes(r.bodyBytes).padStart(11);
      const msgsB = formatBytes(r.messagesBytes).padStart(11);
      const toolsB = formatBytes(r.toolsBytes).padStart(11);
      console.log(`  ${round} | ${msgs} | ${toolsN} | ${body} | ${msgsB} | ${toolsB}`);
    }
    console.log(`\n  Total rounds:          ${requests.length}`);
    console.log(
      `  Tool catalog size:     ${formatBytes(firstToolsBytes)} (${requests[0].toolCount} tools)`
    );
    console.log(`  Total bytes sent:      ${formatBytes(totalBytes)}`);
    console.log(`  Of which messages:     ${formatBytes(totalMessagesBytes)}`);
    console.log(`  Of which tools:        ${formatBytes(totalToolsBytes)}`);
    console.log(
      `  Redundant tool bytes:  ${formatBytes(redundantToolsBytes)} (${redundantToolsPct}% of total, cacheable across ${requests.length - 1} continuation${requests.length === 2 ? "" : "s"})`
    );
    console.log(`\n  With prompt caching (tools + messages prefix per round):`);
    console.log(`  Billable input now:    ${formatBytes(uncachedBillable)}`);
    console.log(
      `  Billable input cached: ${formatBytes(cachedBillable)} (saves ${formatBytes(cacheSavingsBytes)}, −${cacheSavingsPct}%)`
    );
  });
});
