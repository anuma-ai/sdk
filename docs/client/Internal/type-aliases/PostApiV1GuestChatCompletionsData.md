# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:9194](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9194)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:9198](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9198)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:9199](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9199)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9205)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9206](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9206)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:9207](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9207)
