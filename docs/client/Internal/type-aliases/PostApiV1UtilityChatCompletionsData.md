# PostApiV1UtilityChatCompletionsData

> **PostApiV1UtilityChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:10932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10932)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:10936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10936)

Chat completion request

***

### headers?

> `optional` **headers**: `object`

Defined in: [src/client/types.gen.ts:10937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10937)

**X-Anuma-Stream-Format?**

> `optional` **X-Anuma-Stream-Format**: `string`

Set to 'openai' to receive standard OpenAI chat.completion.chunk streaming instead of the native response envelope

**X-Stream-Resumable?**

> `optional` **X-Stream-Resumable**: `string`

Set to 1 to opt this stream into detach-on-disconnect (resumable streaming)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:10947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10947)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10948)

***

### url

> **url**: `"/api/v1/utility/chat/completions"`

Defined in: [src/client/types.gen.ts:10949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10949)
