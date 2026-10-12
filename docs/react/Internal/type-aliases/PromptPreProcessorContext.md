# PromptPreProcessorContext

> **PromptPreProcessorContext** = `object`

Defined in: [src/lib/chat/preProcessor.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#3)

## Properties

### embedding

> **embedding**: `number`\[]

Defined in: [src/lib/chat/preProcessor.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#7)

Embedding of `prompt`, computed once and shared across pre-processors.

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/chat/preProcessor.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#5)

Text of the last user message.

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chat/preProcessor.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#9)

Abort signal forwarded from the tool loop.
