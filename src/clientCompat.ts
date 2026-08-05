// Backwards-compat shims for type names / shapes that disappeared or moved
// when the portal adopted the OpenAI-precise schema. The wire JSON for
// these structures is unchanged (still the standard OpenAI shapes);
// only the schema's TypeScript names became more verbose, and a few
// portal-specific fields moved under a `portal` envelope.
//
// This file is hand-written and lives outside `src/client/` because
// `@hey-api/openapi-ts` wipes that directory on every `pnpm spec` run.
// `scripts/patch-generated-client.mjs` re-exports these names from
// `src/client/index.ts` so the wildcard re-export from `./types.gen` does
// not shadow them.

import type {
  LlmapiChatCompletionResponse as GeneratedLlmapiChatCompletionResponse,
  LlmapiMessage,
  LlmapiResponseResponse as GeneratedLlmapiResponseResponse,
  LlmapiToolCallEvent,
  OpenaiCompletionUsage,
} from "./client/types.gen";

// The previous LlmapiChatCompletionTool was permissive (`{ [key: string]: unknown }`).
// The new strict OpenaiChatCompletionToolParam adds union variants we don't use
// internally — keep the permissive alias so the SDK and consumers can pass
// through OpenAI-format tool definitions without union wrapping.
//
// TODO(tighten-chat-completion-tool-types) [#549]: the `{ [key: string]: unknown }`
// shim unblocks the migration but gives consumers zero autocomplete /
// type-checking on tool and tool_choice definitions. Follow-up: model these on
// the OpenAI function-tool shape (name/description/parameters) — likely a
// trimmed alias over OpenaiChatCompletionToolParam that drops the unused union
// variants — and migrate internal callers (serverTools, toolLoop, useChat) off
// the index-signature type.
export type LlmapiChatCompletionTool = { [key: string]: unknown };
export type LlmapiChatCompletionToolChoice = { [key: string]: unknown };

// Choice shape under a new name.
export type { OpenaiChatCompletionChoice as LlmapiChoice } from "./client/types.gen";

/**
 * The pre-migration usage shape: standard OpenAI token counts plus the
 * portal's cost/credit fields all on one flat object. The new schema splits
 * these — OpenAI tokens stay in `usage`, portal cost fields move to the
 * `portal` envelope — so this type no longer appears in the generated client.
 *
 * Kept as a named alias because it is a public export: removing it on a
 * non-major bump would break consumers (CLI, client, externals) that pin the
 * type by name. The SDK's `buildFinalResponse` mirrors cost fields back into
 * `usage`, so a streaming response's `usage` still matches this shape.
 */
export type LlmapiChatCompletionUsage = OpenaiCompletionUsage & {
  cost_micro_usd?: number;
  credits_used?: number;
  init_prompt_tokens?: number;
  init_completion_tokens?: number;
  provider_cost_micro_usd?: number;
  pricing_source?: string;
  tool_cost_micro_usd?: number;
};

/**
 * Override the generated `LlmapiChatCompletionResponse` so legacy top-level
 * fields (`tools_checksum`, `tool_call_events`, `inference_id`, ...) and
 * cost-on-usage (`usage.cost_micro_usd`, `usage.credits_used`) remain readable
 * by SDK consumers that haven't migrated to the new `portal` envelope.
 *
 * The portal returns the strict OpenAI-compliant shape on the wire; the SDK's
 * streaming `buildFinalResponse` populates both paths so reads on either side
 * succeed. Non-streaming direct calls (`postApiV1ChatCompletions`) return only
 * the wire shape — legacy fields are `undefined` there, matching the optional
 * typing below.
 *
 * TODO(deprecate-legacy-chat-completion-mirrors) [#548]: the legacy top-level
 * fields and the cost-on-`usage` fields below are slated for removal in the
 * next SDK MAJOR bump, paired with the mirror-emission in
 * strategies/completions.ts `buildFinalResponse`. See that TODO for the full
 * deprecation plan.
 */
/**
 * Add the Responses API's terminal-state fields, which the portal's generated
 * schema does not declare.
 *
 * Without them the two transports are asymmetric: a completions consumer reads
 * `choices[0].finish_reason` and can see a turn cut off at the output ceiling,
 * while a Responses consumer has no field to read at all — the truncation the
 * SDK *did* detect (see the normalization in `strategies/responses.ts`) died at
 * the stream boundary. `runToolLoop` works around this with `terminalState` on
 * its own result, but a caller holding only a response object cannot (#805).
 *
 * These are standard OpenAI Responses fields, so this widens the type toward
 * the wire rather than inventing shape: they are optional because a
 * non-streaming direct call returns only what the portal serializes today.
 * Drop the override once the portal declares them upstream.
 */
export type LlmapiResponseResponse = GeneratedLlmapiResponseResponse & {
  /** `"completed"` | `"incomplete"` — the turn's own status, not an output item's. */
  status?: string;
  /** Present when `status` is `"incomplete"`; `"max_output_tokens"` is a truncation. */
  incomplete_details?: { reason?: string };
};

export type LlmapiChatCompletionResponse = Omit<GeneratedLlmapiChatCompletionResponse, "usage"> & {
  usage?: LlmapiChatCompletionUsage;
  inference_id?: string;
  image_model?: string;
  tools_checksum?: string;
  tool_call_events?: Array<LlmapiToolCallEvent>;
  client_injected_tools?: Array<string>;
  portal_injected_tools?: Array<string>;
  messages?: Array<LlmapiMessage>;
};
