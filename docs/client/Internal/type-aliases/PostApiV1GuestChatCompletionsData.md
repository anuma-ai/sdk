# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8461](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8461)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8465](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8465)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8466)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8472)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8473)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8474)
