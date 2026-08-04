# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8945)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8949)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8950)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8956](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8956)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8957)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8958)
