# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8131)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8135)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8136)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8142)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8143)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8144)
