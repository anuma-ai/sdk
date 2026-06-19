# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7849)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7853)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:7854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7854)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7860)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7861)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:7862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7862)
