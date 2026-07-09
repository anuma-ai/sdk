# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8160)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8164)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8165)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8171)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8172](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8172)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8173)
