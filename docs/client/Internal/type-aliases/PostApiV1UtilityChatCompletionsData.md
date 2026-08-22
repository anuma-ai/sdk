# PostApiV1UtilityChatCompletionsData

> **PostApiV1UtilityChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:11283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11283)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:11287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11287)

Chat completion request

***

### headers?

> `optional` **headers**: `object`

Defined in: [src/client/types.gen.ts:11288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11288)

**X-Anuma-Stream-Format?**

> `optional` **X-Anuma-Stream-Format**: `string`

Set to 'openai' to receive standard OpenAI chat.completion.chunk streaming instead of the native response envelope

**X-Stream-Resumable?**

> `optional` **X-Stream-Resumable**: `string`

Set to 1 to opt this stream into detach-on-disconnect (resumable streaming)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:11298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11298)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11299)

***

### url

> **url**: `"/api/v1/utility/chat/completions"`

Defined in: [src/client/types.gen.ts:11300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11300)
