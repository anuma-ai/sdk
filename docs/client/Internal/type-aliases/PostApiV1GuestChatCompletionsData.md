# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8419)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8423)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8424)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8430)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8431](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8431)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8432)
