# PromptPreProcessorContext

> **PromptPreProcessorContext** = `object`

Defined in: [src/lib/chat/preProcessor.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#13)

## Properties

### embedding

> **embedding**: `number`\[]

Defined in: [src/lib/chat/preProcessor.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#17)

Embedding of `prompt`, computed once and shared across pre-processors.

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/chat/preProcessor.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#15)

Text of the last user message.

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chat/preProcessor.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#19)

Abort signal forwarded from the tool loop.
