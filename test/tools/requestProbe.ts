/**
 * Request probe e2e: measures per-round LLM request payload sizes.
 *
 * Runs a multi-round tool-chaining flow (geolocate → timezone) and uses the
 * `onRequest` callback on `runToolLoop` to capture, for each round, the byte
 * size of the full request body, the messages array, and the tools array.
 *
 * Prints a table of per-round metrics plus aggregate stats: total bytes sent,
 * redundant tool-schema bytes (the tool catalog is resent on every continuation
 * with no caching), and message-history growth across rounds. This is the data
 * point behind the "add prompt caching" / "prune tools between rounds"
 * optimization recommendations.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop, type RequestEvent } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import { config, wrapTool, type ToolCallLog } from "./setup.js";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

describe("request-probe", () => {
  it("captures per-round request payload sizes and reports redundancy", async () => {
    const log: ToolCallLog[] = [];
    const geolocateTool = wrapTool(createIpGeolocationTool(), log);
    const timezoneTool = wrapTool(createTimezoneTool(), log);

    const requests: RequestEvent[] = [];

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [geolocateTool, timezoneTool],
      toolChoice: "auto",
      maxToolRounds: 5,
      onRequest: (event) => {
        requests.push(event);
      },
    });

    expect(result.error).toBeNull();

    // Multi-round chaining → at least 2 requests (initial + 1 continuation).
    expect(requests.length).toBeGreaterThanOrEqual(2);

    // Rounds are emitted sequentially starting from 0.
    for (let i = 0; i < requests.length; i++) {
      expect(requests[i].round).toBe(i);
    }

    // Sanity: every request includes the tool catalog and at least one message.
    for (const r of requests) {
      expect(r.toolCount).toBeGreaterThan(0);
      expect(r.messageCount).toBeGreaterThan(0);
      expect(r.bodyBytes).toBeGreaterThan(0);
      expect(r.toolsBytes).toBeGreaterThan(0);
      expect(r.messagesBytes).toBeGreaterThan(0);
    }

    // Tool catalog is resent unchanged on every round (no incremental tools API,
    // no pruning between rounds). Assert byte-identical to make redundancy
    // visible — if this ever stops being true, the probe table will show it.
    const firstToolsBytes = requests[0].toolsBytes;
    for (const r of requests) {
      expect(r.toolsBytes).toBe(firstToolsBytes);
    }

    // Message history grows monotonically across rounds.
    for (let i = 1; i < requests.length; i++) {
      expect(requests[i].messageCount).toBeGreaterThan(requests[i - 1].messageCount);
      expect(requests[i].messagesBytes).toBeGreaterThan(requests[i - 1].messagesBytes);
    }

    // Aggregate metrics.
    const totalBytes = requests.reduce((s, r) => s + r.bodyBytes, 0);
    const totalToolsBytes = requests.reduce((s, r) => s + r.toolsBytes, 0);
    // The first round's tool catalog is necessary; everything after is
    // redundant from a caching perspective.
    const redundantToolsBytes = totalToolsBytes - firstToolsBytes;
    const totalMessagesBytes = requests.reduce((s, r) => s + r.messagesBytes, 0);

    console.log("\n  Per-round request payload:");
    console.log("  round | msgs |  tools |        body |    messages |       tools");
    console.log("  ------+------+--------+-------------+-------------+------------");
    for (const r of requests) {
      const round = String(r.round).padStart(5);
      const msgs = String(r.messageCount).padStart(4);
      const tools = String(r.toolCount).padStart(6);
      const body = formatBytes(r.bodyBytes).padStart(11);
      const msgsB = formatBytes(r.messagesBytes).padStart(11);
      const toolsB = formatBytes(r.toolsBytes).padStart(11);
      console.log(`  ${round} | ${msgs} | ${tools} | ${body} | ${msgsB} | ${toolsB}`);
    }
    console.log(`\n  Total rounds:          ${requests.length}`);
    console.log(`  Total bytes sent:      ${formatBytes(totalBytes)}`);
    console.log(`  Of which messages:     ${formatBytes(totalMessagesBytes)}`);
    console.log(`  Of which tools:        ${formatBytes(totalToolsBytes)}`);
    console.log(
      `  Redundant tool bytes:  ${formatBytes(redundantToolsBytes)} (cacheable across ${requests.length - 1} continuation${requests.length === 2 ? "" : "s"})`
    );
  });
});
