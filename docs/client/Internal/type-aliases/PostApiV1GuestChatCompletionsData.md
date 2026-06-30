# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8107)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8111)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8112)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8118)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8119)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8120)
