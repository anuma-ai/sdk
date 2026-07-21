# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8409)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8413)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8414)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8420](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8420)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8421](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8421)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8422)
