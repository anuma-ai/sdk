# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:10076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10076)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:10080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10080)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:10081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10081)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:10087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10087)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10088)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:10089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10089)
