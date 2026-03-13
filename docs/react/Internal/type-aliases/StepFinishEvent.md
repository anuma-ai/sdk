# StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [src/lib/chat/toolLoop.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#66)

Information emitted after each tool execution round completes.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chat/toolLoop.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#70)

Text content the model produced in this round (may be empty if the model only called tools).

***

### stepIndex

> **stepIndex**: `number`

Defined in: [src/lib/chat/toolLoop.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#68)

1-based index of this tool round.

***

### toolCalls

> **toolCalls**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#72)

Tool calls the model made in this round.

**arguments**

> **arguments**: `string`

**name**

> **name**: `string`

***

### toolResults

> **toolResults**: `object`\[]

Defined in: [src/lib/chat/toolLoop.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#74)

Results from auto-executed tools in this round.

**error?**

> `optional` **error**: `string`

**name**

> **name**: `string`

**result**

> **result**: `unknown`

***

### usage

> **usage**: `object`

Defined in: [src/lib/chat/toolLoop.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolLoop.ts#76)

Token usage for this round, if available.

**inputTokens?**

> `optional` **inputTokens**: `number`

**outputTokens?**

> `optional` **outputTokens**: `number`
