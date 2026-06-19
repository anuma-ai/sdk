# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7886)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7890)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:7891](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7891)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7897](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7897)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7898)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:7899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7899)
