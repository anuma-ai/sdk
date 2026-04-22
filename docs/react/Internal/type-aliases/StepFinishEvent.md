# StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#139)

Information emitted after each tool execution round completes.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chat/toolLoop.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#143)

Text content the model produced in this round (may be empty if the model only called tools).

***

### stepIndex

> **stepIndex**: `number`

Defined in: [src/lib/chat/toolLoop.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#141)

1-based index of this tool round.

***

### toolCalls

> **toolCalls**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#145)

Tool calls the model made in this round.

**arguments**

> **arguments**: `string`

**name**

> **name**: `string`

***

### toolResults

> **toolResults**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#147)

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

Defined in: [src/lib/chat/toolLoop.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#154)

Token usage for this round, if available.

**inputTokens?**

> `optional` **inputTokens**: `number`

**outputTokens?**

> `optional` **outputTokens**: `number`
