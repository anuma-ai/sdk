# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:9577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9577)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:9581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9581)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:9582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9582)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9588](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9588)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9589)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:9590](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9590)
