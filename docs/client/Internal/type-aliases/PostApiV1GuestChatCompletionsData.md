# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8483](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8483)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8487)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8488)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8494](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8494)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8495)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8496)
