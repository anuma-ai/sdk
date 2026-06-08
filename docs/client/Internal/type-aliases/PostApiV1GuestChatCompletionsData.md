# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7451](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7451)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7455](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7455)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:7456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7456)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7462](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7462)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7463](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7463)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:7464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7464)
