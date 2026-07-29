# PostApiV1UtilityChatCompletionsData

> **PostApiV1UtilityChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:10233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10233)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:10237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10237)

Chat completion request

***

### headers?

> `optional` **headers**: `object`

Defined in: [src/client/types.gen.ts:10238](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10238)

**X-Anuma-Stream-Format?**

> `optional` **X-Anuma-Stream-Format**: `string`

Set to 'openai' to receive standard OpenAI chat.completion.chunk streaming instead of the native response envelope

**X-Stream-Resumable?**

> `optional` **X-Stream-Resumable**: `string`

Set to 1 to opt this stream into detach-on-disconnect (resumable streaming)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:10248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10248)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10249)

***

### url

> **url**: `"/api/v1/utility/chat/completions"`

Defined in: [src/client/types.gen.ts:10250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10250)
