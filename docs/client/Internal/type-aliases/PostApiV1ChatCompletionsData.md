# PostApiV1ChatCompletionsData

> **PostApiV1ChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:6708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6708)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:6712](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6712)

Chat completion request

***

### headers?

> `optional` **headers**: `object`

Defined in: [src/client/types.gen.ts:6713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6713)

**X-Anuma-Stream-Format?**

> `optional` **X-Anuma-Stream-Format**: `string`

Set to 'openai' to receive standard OpenAI chat.completion.chunk streaming instead of the native response envelope

**X-Stream-Resumable?**

> `optional` **X-Stream-Resumable**: `string`

Set to 1 to opt this stream into detach-on-disconnect (resumable streaming)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:6723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6723)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:6724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6724)

***

### url

> **url**: `"/api/v1/chat/completions"`

Defined in: [src/client/types.gen.ts:6725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6725)
