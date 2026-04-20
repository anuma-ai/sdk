/**
 * E2E test: subscription analysis tools
 *
 * Verifies that the model calls analyze_subscriptions and flag_subscriptions
 * with valid structured data, and that the executors return correct results.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createSubscriptionAnalysisTools } from "../../src/tools/subscriptionAnalysis.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import type {
  AnalyzeSubscriptionsResult,
  FlagSubscriptionsResult,
} from "../../src/tools/subscriptionAnalysis.js";

function wrapAll(tools: ReturnType<typeof createSubscriptionAnalysisTools>, log: ToolCallLog[]) {
  return tools.map((t) => wrapTool(t, log));
}

const STATEMENT = `
CHASE VISA — Statement Period 03/01/2025 – 03/31/2025

03/01  NETFLIX.COM              15.99
03/01  SPOTIFY USA              11.99
03/05  ADOBE *CREATIVE CLD      59.99
03/07  PLANET FITNESS           24.99
03/10  AMAZON PRIME             14.99
03/15  MICROSOFT *365           9.99
03/15  NYT DIGITAL              4.25
03/20  HULU LLC                 17.99
03/22  CHATGPT PLUS             20.00
`;

describe("analyze_subscriptions", () => {
  it("extracts subscriptions from a statement and computes totals", async () => {
    const log: ToolCallLog[] = [];
    const tools = wrapAll(createSubscriptionAnalysisTools(), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a subscription analyzer. Parse the statement and call analyze_subscriptions with every recurring charge you find. Do not call flag_subscriptions.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: STATEMENT }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);
    expect(result.error).toBeNull();

    const analyzeCall = log.find((l) => l.name === "analyze_subscriptions");
    expect(analyzeCall).toBeDefined();

    const raw = analyzeCall!.result;
    const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as AnalyzeSubscriptionsResult;
    expect("error" in parsed).toBe(false);

    if (!("error" in parsed)) {
      // Should have found most of the 9 subscriptions
      expect(parsed.subscription_count).toBeGreaterThanOrEqual(7);

      // Totals must be positive and consistent
      expect(parsed.totals.monthly).toBeGreaterThan(0);
      expect(parsed.totals.annual).toBeCloseTo(parsed.totals.monthly * 12, 0);

      // Every item should have normalized amounts
      for (const sub of parsed.subscriptions) {
        expect(sub.monthly_amount).toBeGreaterThan(0);
        expect(sub.annual_amount).toBeCloseTo(sub.monthly_amount * 12, 0);
      }

      // Category breakdown should exist
      expect(Object.keys(parsed.totals.by_category).length).toBeGreaterThan(0);
    }
  });
});

describe("flag_subscriptions", () => {
  it("flags duplicate streaming services and computes savings", async () => {
    const log: ToolCallLog[] = [];
    const tools = wrapAll(createSubscriptionAnalysisTools(), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `You are a subscription analyzer. First call analyze_subscriptions with the subscriptions from the statement, then call flag_subscriptions to flag any issues you find. The statement has multiple streaming services (Netflix, Hulu, Spotify) — flag duplicates/overlapping services.`,
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: STATEMENT }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(result);
    expect(result.error).toBeNull();

    // Both tools should have been called
    const analyzeCall = log.find((l) => l.name === "analyze_subscriptions");
    const flagCall = log.find((l) => l.name === "flag_subscriptions");
    expect(analyzeCall).toBeDefined();
    expect(flagCall).toBeDefined();

    const flagResult = (
      typeof flagCall!.result === "string" ? JSON.parse(flagCall!.result) : flagCall!.result
    ) as FlagSubscriptionsResult;
    expect("error" in flagResult).toBe(false);

    if (!("error" in flagResult)) {
      expect(flagResult.summary.total_flags).toBeGreaterThanOrEqual(1);

      // Each flag should have required fields
      for (const flag of flagResult.flags) {
        expect(flag.name).toBeTruthy();
        expect(flag.type).toBeTruthy();
        expect(flag.detail).toBeTruthy();
      }
    }
  });
});

describe("frequency normalization", () => {
  it("correctly normalizes annual subscriptions to monthly", async () => {
    const log: ToolCallLog[] = [];
    const tools = wrapAll(createSubscriptionAnalysisTools(), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: 'Call analyze_subscriptions with exactly one subscription: name "Amazon Prime", amount 139, frequency "annual", category "streaming". Do not call any other tool.',
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: "Analyze my subscription." }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 2,
    });

    printResult(result);
    expect(result.error).toBeNull();

    const call = log.find((l) => l.name === "analyze_subscriptions");
    expect(call).toBeDefined();

    const parsed = (
      typeof call!.result === "string" ? JSON.parse(call!.result) : call!.result
    ) as AnalyzeSubscriptionsResult;
    expect("error" in parsed).toBe(false);

    if (!("error" in parsed)) {
      expect(parsed.subscriptions).toHaveLength(1);
      const sub = parsed.subscriptions[0]!;
      // 139 / 12 = 11.58
      expect(sub.monthly_amount).toBeCloseTo(11.58, 1);
      expect(sub.annual_amount).toBeCloseTo(139, 0);
    }
  });
});
