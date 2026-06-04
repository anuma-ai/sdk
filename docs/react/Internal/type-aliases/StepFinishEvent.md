# StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:377](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#377)

Information emitted after each tool execution round completes.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chat/toolLoop.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#381)

Text content the model produced in this round (may be empty if the model only called tools).

***

### stepIndex

> **stepIndex**: `number`

Defined in: [src/lib/chat/toolLoop.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#379)

1-based index of this tool round.

***

### toolCalls

> **toolCalls**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#383)

Tool calls the model made in this round.

**arguments**

> **arguments**: `string`

**name**

> **name**: `string`

***

### toolResults

> **toolResults**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:385](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#385)

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

Defined in: [src/lib/chat/toolLoop.ts:392](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#392)

Token usage for this round, if available.

**inputTokens?**

> `optional` **inputTokens**: `number`

**outputTokens?**

> `optional` **outputTokens**: `number`
