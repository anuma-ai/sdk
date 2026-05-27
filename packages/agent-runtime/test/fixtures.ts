/**
 * Test fixtures shared across the e2e suite. Kept tiny so each test can
 * read its own setup at a glance.
 */

import type { StreamingTransport, StreamingTransportResult } from "@anuma/sdk/server";

import type { AgentConfigLike } from "../src/runAgentRequest.js";
import type { IncomingRequest } from "../src/types.js";

import type { StubGrant } from "./stub-portal.js";

export const havenAgent: AgentConfigLike = {
  prompt: "you are haven",
  model: { default: "stub/agent-runtime-test" },
};

export const havenGrant: StubGrant = {
  userAddress: "0xhaven-user",
  clientId: "haven_v1",
  scopes: ["credits:spend", "connector:gmail:read"],
};

export const sentinelGrant: StubGrant = {
  userAddress: "0xsentinel-user",
  clientId: "sentinel_v1",
  scopes: ["credits:spend"], // no gmail
};

export function mockReq(bearer: string): IncomingRequest {
  return { headers: { authorization: `Bearer ${bearer}` } };
}

/**
 * Plan-driven streaming transport for tests.
 *
 * Each round in the loop fires the next entry of `plans`:
 *   - kind: "tool_call" → emits a tool-call chunk + finish_reason: "tool_calls"
 *   - kind: "assistant" → emits a content chunk + finish_reason: "stop"
 *
 * Rounds advance via runToolLoop calling the transport once per LLM
 * request. The transport returns an async iterable that yields the
 * planned chunks immediately and ends.
 */
export interface ToolCallPlan {
  kind: "tool_call";
  toolName: string;
  args?: Record<string, unknown>;
  toolCallId?: string;
}
export interface AssistantPlan {
  kind: "assistant";
  content: string;
}
export type LlmPlan = ToolCallPlan | AssistantPlan;

function chunksForPlan(plan: LlmPlan): unknown[] {
  if (plan.kind === "assistant") {
    return [
      {
        id: "chunk-1",
        choices: [
          {
            index: 0,
            delta: { content: plan.content },
          },
        ],
      },
      {
        id: "chunk-2",
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 4, completion_tokens: 8, total_tokens: 12 },
      },
    ];
  }
  const callId = plan.toolCallId ?? `call_${Math.random().toString(36).slice(2)}`;
  return [
    {
      id: "chunk-1",
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                id: callId,
                type: "function",
                function: {
                  name: plan.toolName,
                  arguments: JSON.stringify(plan.args ?? {}),
                },
              },
            ],
          },
        },
      ],
    },
    {
      id: "chunk-2",
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "tool_calls",
        },
      ],
    },
  ];
}

/**
 * Build a transport that walks through `plans` round by round. Each call
 * pops the next plan and yields its chunks.
 */
export function plannedTransport(plans: LlmPlan[]): StreamingTransport {
  let round = 0;
  return (): StreamingTransportResult => {
    const plan = plans[round] ?? plans[plans.length - 1];
    round += 1;
    const chunks = chunksForPlan(plan);
    const stream = (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
    return { stream };
  };
}
