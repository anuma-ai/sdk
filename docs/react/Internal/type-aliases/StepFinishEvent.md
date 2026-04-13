# StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#126)

Information emitted after each tool execution round completes.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chat/toolLoop.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#130)

Text content the model produced in this round (may be empty if the model only called tools).

***

### stepIndex

> **stepIndex**: `number`

Defined in: [src/lib/chat/toolLoop.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#128)

1-based index of this tool round.

***

### toolCalls

> **toolCalls**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#132)

Tool calls the model made in this round.

**arguments**

> **arguments**: `string`

**name**

> **name**: `string`

***

### toolResults

> **toolResults**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#134)

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

Defined in: [src/lib/chat/toolLoop.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#141)

Token usage for this round, if available.

**inputTokens?**

> `optional` **inputTokens**: `number`

**outputTokens?**

> `optional` **outputTokens**: `number`
