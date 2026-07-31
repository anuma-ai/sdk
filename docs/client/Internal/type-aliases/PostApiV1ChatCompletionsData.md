# PostApiV1ChatCompletionsData

> **PostApiV1ChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7228)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7232)

Chat completion request

***

### headers?

> `optional` **headers**: `object`

Defined in: [src/client/types.gen.ts:7233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7233)

**X-Anuma-Stream-Format?**

> `optional` **X-Anuma-Stream-Format**: `string`

Set to 'openai' to receive standard OpenAI chat.completion.chunk streaming instead of the native response envelope

**X-Stream-Resumable?**

> `optional` **X-Stream-Resumable**: `string`

Set to 1 to opt this stream into detach-on-disconnect (resumable streaming)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7243)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7244](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7244)

***

### url

> **url**: `"/api/v1/chat/completions"`

Defined in: [src/client/types.gen.ts:7245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7245)
