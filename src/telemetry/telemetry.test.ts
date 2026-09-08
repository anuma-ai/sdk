import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ModelCallEndEvent,
  ModelCallStartEvent,
  RunEndEvent,
  RunErrorEvent,
  RunHooks,
  RunStartEvent,
  ToolUseEndEvent,
  ToolUseStartEvent,
} from "../lib/chat/runHooks";
import type { RecallDiagnostics } from "../lib/memory/types";
import { createMetricsHooks } from "./metrics";
import { createRecallDiagnosticsHandler } from "./recall";
import { noopTelemetrySink, type TelemetrySink } from "./types";

type TrackedEvent = { event: string; properties: Record<string, unknown> };
type RecordedMetric = { name: string; value: number; tags: Record<string, string> };

function makeSink(): TelemetrySink & { events: TrackedEvent[]; metrics: RecordedMetric[] } {
  const events: TrackedEvent[] = [];
  const metrics: RecordedMetric[] = [];
  return {
    events,
    metrics,
    track: (event, properties) => {
      events.push({ event, properties });
    },
    metric: (name, value, tags) => {
      metrics.push({ name, value, tags });
    },
  };
}

/** Deterministic clock: each call advances 5ms. */
function makeClock(start = 1_000): { now: () => number } {
  let t = start;
  return {
    now: () => {
      t += 5;
      return t;
    },
  };
}

const runStart: RunStartEvent = {
  runId: "run-1",
  model: "gpt-test",
  messages: [],
  tools: [],
};

const modelStart = (stepIndex = 0): ModelCallStartEvent => ({
  runId: "run-1",
  stepIndex,
  model: "gpt-test",
  messages: [],
  tools: [],
  requestBody: {},
});

const modelEnd = (overrides: Partial<ModelCallEndEvent> = {}): ModelCallEndEvent => ({
  runId: "run-1",
  stepIndex: 0,
  content: "done",
  toolCalls: [],
  ...overrides,
});

const toolStart = (overrides: Partial<ToolUseStartEvent> = {}): ToolUseStartEvent => ({
  runId: "run-1",
  stepIndex: 0,
  toolCallId: "tc-1",
  name: "web_search",
  rawArguments: "{}",
  ...overrides,
});

const toolEnd = (overrides: Partial<ToolUseEndEvent> = {}): ToolUseEndEvent => ({
  runId: "run-1",
  stepIndex: 0,
  toolCallId: "tc-1",
  name: "web_search",
  result: "ok",
  ...overrides,
});

describe("createMetricsHooks", () => {
  let clock: ReturnType<typeof makeClock>;
  let sink: ReturnType<typeof makeSink>;

  beforeEach(() => {
    clock = makeClock();
    sink = makeSink();
  });

  it("emits run.started then run.completed with durationMs and totalSteps", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    const end: RunEndEvent = { runId: "run-1", finalContent: "done", totalSteps: 2 };
    hooks.onRunEnd?.(end);

    expect(sink.events).toEqual([
      { event: "run.started", properties: { runId: "run-1", model: "gpt-test" } },
      {
        event: "run.completed",
        properties: { runId: "run-1", totalSteps: 2, durationMs: 5 },
      },
    ]);
    expect(sink.metrics).toContainEqual({
      name: "run.duration",
      value: 5,
      tags: { model: "gpt-test", outcome: "completed" },
    });
  });

  it("emits run.failed with errorType from errorObject and outcome=failed metric", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    const err: RunErrorEvent = {
      runId: "run-1",
      error: "stream exploded",
      stage: "model",
      errorObject: new TypeError("stream exploded"),
    };
    hooks.onRunError?.(err);

    expect(sink.events[1]).toEqual({
      event: "run.failed",
      properties: {
        runId: "run-1",
        durationMs: 5,
        errorType: "TypeError",
        stage: "model",
      },
    });
    expect(sink.metrics).toContainEqual({
      name: "run.duration",
      value: 5,
      tags: { model: "gpt-test", outcome: "failed" },
    });
  });

  it("falls back to errorType 'Error' when errorObject is absent", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.onRunError?.({ runId: "run-1", error: "aborted", stage: "model" });
    expect(sink.events[1]?.properties.errorType).toBe("Error");
  });

  it("emits model.call.completed with latencyMs and token counts from usage", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeModelCall?.(modelStart());
    hooks.afterModelCall?.(
      modelEnd({ usage: { inputTokens: 120, outputTokens: 34 }, finishReason: "stop" })
    );

    expect(sink.events).toContainEqual({
      event: "model.call.completed",
      properties: {
        runId: "run-1",
        stepIndex: 0,
        latencyMs: 5,
        model: "gpt-test",
        inputTokens: 120,
        outputTokens: 34,
        finishReason: "stop",
      },
    });
    expect(sink.metrics).toContainEqual({
      name: "model.call.latency",
      value: 5,
      tags: { model: "gpt-test", outcome: "completed" },
    });
    expect(sink.metrics).toContainEqual({
      name: "model.call.tokens",
      value: 120,
      tags: { model: "gpt-test", direction: "input" },
    });
    expect(sink.metrics).toContainEqual({
      name: "model.call.tokens",
      value: 34,
      tags: { model: "gpt-test", direction: "output" },
    });
  });

  it("omits token properties when usage is absent", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeModelCall?.(modelStart());
    hooks.afterModelCall?.(modelEnd());

    const evt = sink.events.find((e) => e.event === "model.call.completed");
    expect(evt).toBeDefined();
    expect(evt?.properties).not.toHaveProperty("inputTokens");
    expect(evt?.properties).not.toHaveProperty("outputTokens");
    expect(sink.metrics.find((m) => m.name === "model.call.tokens")).toBeUndefined();
  });

  it("emits model.call.failed when afterModelCall carries error", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeModelCall?.(modelStart());
    hooks.afterModelCall?.(modelEnd({ error: "provider 500" }));

    expect(sink.events).toContainEqual({
      event: "model.call.failed",
      properties: {
        runId: "run-1",
        stepIndex: 0,
        latencyMs: 5,
        model: "gpt-test",
      },
    });
    expect(sink.metrics).toContainEqual({
      name: "model.call.latency",
      value: 5,
      tags: { model: "gpt-test", outcome: "failed" },
    });
  });

  it("emits tool.call.completed with toolName and durationMs", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeToolUse?.(toolStart());
    hooks.afterToolUse?.(toolEnd());

    expect(sink.events).toContainEqual({
      event: "tool.call.completed",
      properties: {
        runId: "run-1",
        stepIndex: 0,
        toolCallId: "tc-1",
        toolName: "web_search",
        durationMs: 5,
      },
    });
    expect(sink.metrics).toContainEqual({
      name: "tool.call.duration",
      value: 5,
      tags: { toolName: "web_search", outcome: "completed" },
    });
  });

  it("emits tool.call.failed with errorType for execution failures", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeToolUse?.(toolStart());
    hooks.afterToolUse?.(toolEnd({ result: undefined, error: "boom", errorType: "execution" }));

    expect(sink.events).toContainEqual({
      event: "tool.call.failed",
      properties: {
        runId: "run-1",
        stepIndex: 0,
        toolCallId: "tc-1",
        toolName: "web_search",
        durationMs: 5,
        errorType: "execution",
      },
    });
    expect(sink.metrics).toContainEqual({
      name: "tool.call.duration",
      value: 5,
      tags: { toolName: "web_search", outcome: "failed", errorType: "execution" },
    });
  });

  it("treats errorType without error message as a failure", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.beforeToolUse?.(toolStart());
    hooks.afterToolUse?.(toolEnd({ result: undefined, errorType: "timeout" }));

    expect(sink.events.map((e) => e.event)).toContain("tool.call.failed");
  });

  describe("pairing asymmetries", () => {
    it("emits nothing extra for a server-side tool that gets beforeToolUse but no afterToolUse", () => {
      const hooks = createMetricsHooks(sink, { now: clock.now });
      hooks.onRunStart?.(runStart);
      hooks.beforeToolUse?.(toolStart({ name: "server_tool" }));
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "done", totalSteps: 1 });

      const toolEvents = sink.events.filter((e) => e.event.startsWith("tool."));
      expect(toolEvents).toEqual([]);
      expect(sink.metrics.find((m) => m.name === "tool.call.duration")).toBeUndefined();
    });

    it("clears dangling tool timers at run end so a later run with the same id pair is not corrupted", () => {
      const hooks = createMetricsHooks(sink, { now: clock.now });
      hooks.onRunStart?.(runStart);
      hooks.beforeToolUse?.(toolStart({ toolCallId: "tc-dangling" }));
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "done", totalSteps: 1 });

      // afterToolUse arriving after the run terminated finds no pending timer:
      // still reported, but durationMs omitted. The run state stays deleted.
      hooks.afterToolUse?.(toolEnd({ toolCallId: "tc-dangling" }));
      const evt = sink.events.find((e) => e.event === "tool.call.completed");
      expect(evt?.properties.toolCallId).toBe("tc-dangling");
      expect(evt?.properties).not.toHaveProperty("durationMs");
    });

    it("reports afterToolUse without a matching beforeToolUse, omitting durationMs", () => {
      const hooks = createMetricsHooks(sink, { now: clock.now });
      hooks.onRunStart?.(runStart);
      hooks.afterToolUse?.(toolEnd());

      const evt = sink.events.find((e) => e.event === "tool.call.completed");
      expect(evt).toBeDefined();
      expect(evt?.properties).not.toHaveProperty("durationMs");
      expect(sink.metrics.find((m) => m.name === "tool.call.duration")).toBeUndefined();
    });

    it("reports afterModelCall without a matching beforeModelCall, omitting latencyMs", () => {
      const hooks = createMetricsHooks(sink, { now: clock.now });
      hooks.onRunStart?.(runStart);
      hooks.afterModelCall?.(modelEnd());

      const evt = sink.events.find((e) => e.event === "model.call.completed");
      expect(evt).toBeDefined();
      expect(evt?.properties).not.toHaveProperty("latencyMs");
    });
  });

  describe("raw error messages", () => {
    // Tool-argument parse failures quote the offending arguments: JSON.parse
    // reports `Unexpected token 'h', "hunter2pass" is not valid JSON`, and
    // executeToolCall prefixes it. Executor failures wrap whatever the host
    // threw, which for a deAnonymizeArgs tool has real PII in scope.
    const leaky =
      "Failed to parse tool arguments: Unexpected token 'h', \"hunter2pass\" is not valid JSON";

    function driveFailures(hooks: RunHooks): void {
      hooks.onRunStart?.(runStart);
      hooks.beforeModelCall?.(modelStart());
      hooks.afterModelCall?.(modelEnd({ error: leaky }));
      hooks.beforeToolUse?.(toolStart());
      hooks.afterToolUse?.(toolEnd({ result: undefined, error: leaky, errorType: "parse" }));
      hooks.onRunError?.({ runId: "run-1", error: leaky, stage: "model" });
    }

    it("omits the raw error string from every failure event by default", () => {
      driveFailures(createMetricsHooks(sink, { now: clock.now }));

      const failed = sink.events.filter((e) => e.event.endsWith(".failed"));
      expect(failed.map((e) => e.event)).toEqual([
        "model.call.failed",
        "tool.call.failed",
        "run.failed",
      ]);
      for (const e of failed) {
        expect(e.properties).not.toHaveProperty("error");
      }
      expect(JSON.stringify(sink.events)).not.toContain("hunter2pass");
    });

    it("still reports the safe categorical errorType when the message is withheld", () => {
      driveFailures(createMetricsHooks(sink, { now: clock.now }));

      expect(sink.events.find((e) => e.event === "tool.call.failed")?.properties.errorType).toBe(
        "parse"
      );
      expect(sink.events.find((e) => e.event === "run.failed")?.properties.errorType).toBe("Error");
      expect(sink.metrics).toContainEqual({
        name: "tool.call.duration",
        value: 5,
        tags: { toolName: "web_search", outcome: "failed", errorType: "parse" },
      });
    });

    it("reports the raw error string when the caller opts in", () => {
      driveFailures(createMetricsHooks(sink, { now: clock.now, includeErrorMessages: true }));

      const failed = sink.events.filter((e) => e.event.endsWith(".failed"));
      expect(failed).toHaveLength(3);
      for (const e of failed) {
        expect(e.properties.error).toBe(leaky);
      }
    });
  });

  it("retains no run state after the terminal hook, even if a late hook arrives", () => {
    let t = 0;
    const hooks = createMetricsHooks(sink, { now: () => t });

    hooks.onRunStart?.(runStart);
    t = 10;
    hooks.onRunEnd?.({ runId: "run-1", finalContent: "done", totalSteps: 1 });

    // These arrive after the run is over. They must report, but must not
    // recreate the run state — nothing would ever delete it a second time.
    t = 100;
    hooks.afterToolUse?.(toolEnd({ toolCallId: "tc-late" }));
    t = 200;
    hooks.afterModelCall?.(modelEnd());

    // A second terminal hook for the same run now measures from its own
    // arrival (0ms), not from a resurrected startedAt (400ms).
    t = 500;
    hooks.onRunEnd?.({ runId: "run-1", finalContent: "done", totalSteps: 1 });

    const completions = sink.events.filter((e) => e.event === "run.completed");
    expect(completions[0]?.properties.durationMs).toBe(10);
    expect(completions[1]?.properties.durationMs).toBe(0);

    // The late hooks are still reported, without duration fields.
    const lateTool = sink.events.find((e) => e.properties.toolCallId === "tc-late");
    expect(lateTool?.event).toBe("tool.call.completed");
    expect(lateTool?.properties).not.toHaveProperty("durationMs");
    const lateModel = sink.events.find((e) => e.event === "model.call.completed");
    expect(lateModel?.properties).not.toHaveProperty("latencyMs");
  });

  it("keeps concurrent runs isolated by runId", () => {
    const hooks = createMetricsHooks(sink, { now: clock.now });
    hooks.onRunStart?.({ ...runStart, runId: "run-a" });
    hooks.onRunStart?.({ ...runStart, runId: "run-b" });
    hooks.onRunEnd?.({ runId: "run-a", finalContent: "", totalSteps: 1 });
    hooks.onRunEnd?.({ runId: "run-b", finalContent: "", totalSteps: 3 });

    const a = sink.events.find(
      (e) => e.event === "run.completed" && e.properties.runId === "run-a"
    );
    const b = sink.events.find(
      (e) => e.event === "run.completed" && e.properties.runId === "run-b"
    );
    expect(a?.properties.totalSteps).toBe(1);
    expect(b?.properties.totalSteps).toBe(3);
  });

  it("swallows a throwing sink so the loop is never broken", () => {
    const bad: TelemetrySink = {
      track: () => {
        throw new Error("sink exploded");
      },
      metric: () => {
        throw new Error("sink exploded");
      },
    };
    const hooks = createMetricsHooks(bad, { now: clock.now });
    expect(() => {
      hooks.onRunStart?.(runStart);
      hooks.beforeModelCall?.(modelStart());
      hooks.afterModelCall?.(modelEnd());
      hooks.beforeToolUse?.(toolStart());
      hooks.afterToolUse?.(toolEnd());
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "", totalSteps: 1 });
    }).not.toThrow();
  });

  it("works with a sink that implements only track", () => {
    const events: string[] = [];
    const hooks = createMetricsHooks({ track: (e) => events.push(e) }, { now: clock.now });
    hooks.onRunStart?.(runStart);
    hooks.onRunEnd?.({ runId: "run-1", finalContent: "", totalSteps: 0 });
    expect(events).toEqual(["run.started", "run.completed"]);
  });

  it("swallows rejections from an async sink so no unhandled rejection escapes", async () => {
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      const bad: TelemetrySink = {
        track: () => Promise.reject(new Error("async track exploded")) as unknown as void,
        metric: () => Promise.reject(new Error("async metric exploded")) as unknown as void,
      };
      const hooks = createMetricsHooks(bad, { now: clock.now });
      hooks.onRunStart?.(runStart);
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "", totalSteps: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});

// Durations must never go backward. Date.now() is wall clock and steps BACKWARD
// on an NTP correction or a VM resume, and dogstatsd ingests a negative
// histogram sample rather than rejecting it — permanently corrupting the
// percentiles for that bucket. The default clock is therefore monotonic where
// the runtime has performance.now(), matching lib/memory/recall.ts.
describe("the default clock", () => {
  it("never reports a negative duration when the wall clock steps backward", () => {
    const sink = makeSink();
    const realNow = Date.now;
    let wall = 1_000_000;
    Date.now = () => wall;
    try {
      const hooks = createMetricsHooks(sink);
      hooks.onRunStart?.(runStart);
      // An NTP correction lands mid-run: two minutes backward.
      wall -= 120_000;
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "done", totalSteps: 1 });
    } finally {
      Date.now = realNow;
    }

    const durationMs = sink.events.find((e) => e.event === "run.completed")?.properties.durationMs;
    expect(typeof durationMs).toBe("number");
    expect(durationMs as number).toBeGreaterThanOrEqual(0);
    expect(sink.metrics.find((m) => m.name === "run.duration")?.value).toBeGreaterThanOrEqual(0);
  });
});

describe("createRecallDiagnosticsHandler", () => {
  const diagnostics: RecallDiagnostics = {
    usedBudget: "mid",
    reranked: true,
    candidateCount: 42,
    vaultSize: 500,
    decryptLast: true,
    vaultRowsDecrypted: 30,
    vaultRowsEmbedded: 0,
    factCount: 5,
    chunkCount: 3,
    timings: {
      total: 120,
      prep: 10,
      factLane: 80,
      rerank: 30,
      queryEmbed: 20,
      chunkLane: 15,
      fuse: 5,
    },
    degraded: ["rerank-unavailable", "decompose-moved"],
  };

  it("emits recall.completed with counts and budget, and one recall.degraded per degradation", () => {
    const sink = makeSink();
    const handler = createRecallDiagnosticsHandler(sink);
    handler(diagnostics);

    expect(sink.events).toContainEqual({
      event: "recall.completed",
      properties: {
        usedBudget: "mid",
        reranked: true,
        candidateCount: 42,
        factCount: 5,
        chunkCount: 3,
        totalMs: 120,
        decryptLast: true,
        degradedCount: 2,
      },
    });
    const degraded = sink.events.filter((e) => e.event === "recall.degraded");
    expect(degraded).toEqual([
      { event: "recall.degraded", properties: { reason: "rerank-unavailable", usedBudget: "mid" } },
      { event: "recall.degraded", properties: { reason: "decompose-moved", usedBudget: "mid" } },
    ]);
  });

  // A track-only sink is supported, tested below, and what the module's own
  // PostHog example builds — so the headline recall latency has to survive
  // without `metric`, or that consumer sees events arriving and concludes recall
  // observability works while every latency number goes on the floor.
  it("carries totalMs on recall.completed for a sink that implements only track", () => {
    const events: TrackedEvent[] = [];
    createRecallDiagnosticsHandler({
      track: (event, properties) => events.push({ event, properties }),
    })(diagnostics);

    expect(events.find((e) => e.event === "recall.completed")?.properties.totalMs).toBe(120);
  });

  it("emits one recall.duration metric per timing lane plus count metrics", () => {
    const sink = makeSink();
    createRecallDiagnosticsHandler(sink)(diagnostics);

    for (const [lane, ms] of Object.entries(diagnostics.timings)) {
      expect(sink.metrics).toContainEqual({ name: "recall.duration", value: ms, tags: { lane } });
    }
    expect(sink.metrics).toContainEqual({ name: "recall.candidates", value: 42, tags: {} });
    expect(sink.metrics).toContainEqual({ name: "recall.facts", value: 5, tags: {} });
    expect(sink.metrics).toContainEqual({ name: "recall.chunks", value: 3, tags: {} });
    expect(sink.metrics).toContainEqual({ name: "recall.vault.size", value: 500, tags: {} });
    expect(sink.metrics).toContainEqual({
      name: "recall.vault.rows_decrypted",
      value: 30,
      tags: {},
    });
    expect(sink.metrics).toContainEqual({
      name: "recall.vault.rows_embedded",
      value: 0,
      tags: {},
    });
  });

  it("emits no recall.degraded events and omits vault metrics when the fact lane did not run", () => {
    const sink = makeSink();
    const clean: RecallDiagnostics = {
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
      factCount: 0,
      chunkCount: 0,
      timings: { total: 5, prep: 2, factLane: 0, rerank: 0, queryEmbed: 0, chunkLane: 2, fuse: 1 },
      degraded: [],
    };
    createRecallDiagnosticsHandler(sink)(clean);

    expect(sink.events.filter((e) => e.event === "recall.degraded")).toEqual([]);
    const completed = sink.events.find((e) => e.event === "recall.completed");
    expect(completed?.properties.degradedCount).toBe(0);
    expect(completed?.properties).not.toHaveProperty("decryptLast");
    expect(sink.metrics.find((m) => m.name.startsWith("recall.vault"))).toBeUndefined();
  });

  it("swallows a throwing sink", () => {
    const bad: TelemetrySink = {
      track: () => {
        throw new Error("nope");
      },
    };
    expect(() => createRecallDiagnosticsHandler(bad)(diagnostics)).not.toThrow();
  });

  it("swallows rejections from an async sink so no unhandled rejection escapes", async () => {
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      const bad: TelemetrySink = {
        track: () => Promise.reject(new Error("async track exploded")) as unknown as void,
        metric: () => Promise.reject(new Error("async metric exploded")) as unknown as void,
      };
      createRecallDiagnosticsHandler(bad)(diagnostics);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});

describe("noopTelemetrySink", () => {
  it("accepts track and metric calls without throwing", () => {
    expect(() => {
      noopTelemetrySink.track?.("run.started", { runId: "r" });
      noopTelemetrySink.metric?.("run.duration", 1, {});
    }).not.toThrow();
  });

  it("can drive the adapters as a default sink", () => {
    const hooks = createMetricsHooks(noopTelemetrySink);
    expect(() => {
      hooks.onRunStart?.(runStart);
      hooks.onRunEnd?.({ runId: "run-1", finalContent: "", totalSteps: 0 });
    }).not.toThrow();

    const handler = createRecallDiagnosticsHandler(noopTelemetrySink);
    expect(() =>
      handler({
        usedBudget: "low",
        reranked: false,
        candidateCount: 0,
        factCount: 0,
        chunkCount: 0,
        timings: {
          total: 1,
          prep: 0,
          factLane: 0,
          rerank: 0,
          queryEmbed: 0,
          chunkLane: 0,
          fuse: 0,
        },
        degraded: [],
      })
    ).not.toThrow();
  });

  // Published, shared singleton: createMetricsHooks closes over the OBJECT, not
  // its methods, so a mutation here reroutes every adapter already built from it.
  it("is frozen, so one module cannot reroute every other holder's telemetry", () => {
    expect(Object.isFrozen(noopTelemetrySink)).toBe(true);

    // Reflect.set returns false on a frozen target instead of throwing, so the
    // refusal is directly assertable and no type assertion is needed to attempt
    // the write.
    const hijack = vi.fn();
    expect(Reflect.set(noopTelemetrySink, "track", hijack)).toBe(false);
    noopTelemetrySink.track?.("run.started", { runId: "r" });
    expect(hijack).not.toHaveBeenCalled();
  });
});
