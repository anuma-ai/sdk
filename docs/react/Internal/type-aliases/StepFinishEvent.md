# StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:474](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#474)

Information emitted after each tool execution round completes.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chat/toolLoop.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#478)

Text content the model produced in this round (may be empty if the model only called tools).

***

### finishReason?

> `optional` **finishReason**: `string`

Defined in: [src/lib/chat/toolLoop.ts:504](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#504)

The round's own finish reason, as the provider sent it — `"length"` means
this round hit the output ceiling.

Per-round, not per-turn: a round can truncate and the loop still recover on
the next one, which is why the loop does not treat it as an error on its
own (see the truncation guard below). Without it a consumer watching steps
cannot tell a round that said everything it meant to from one that was cut
off mid-argument — they differ only in this field (#805).

Absent when the provider sent no finish reason. Note that no step event
fires for the round that *ends* a turn, so use RunTerminalState on
the result for the final round.

***

### stepIndex

> **stepIndex**: `number`

Defined in: [src/lib/chat/toolLoop.ts:476](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#476)

1-based index of this tool round.

***

### toolCalls

> **toolCalls**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:480](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#480)

Tool calls the model made in this round.

**arguments**

> **arguments**: `string`

**name**

> **name**: `string`

***

### toolResults

> **toolResults**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:482](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#482)

Results from auto-executed tools in this round.

**error?**

> `optional` **error**: `string`

**errorType?**

> `optional` **errorType**: `ToolExecutionErrorType`

**name**

> **name**: `string`

**result**

> **result**: `unknown`

***

### usage

> **usage**: `object`

Defined in: [src/lib/chat/toolLoop.ts:489](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#489)

Token usage for this round, if available.

**inputTokens?**

> `optional` **inputTokens**: `number`

**outputTokens?**

> `optional` **outputTokens**: `number`
