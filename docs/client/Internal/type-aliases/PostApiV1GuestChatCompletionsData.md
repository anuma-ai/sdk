# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:5697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5697)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:5701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5701)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5702)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:5708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5708)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5709)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:5710](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5710)
