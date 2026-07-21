# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8414)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8418)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8419)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8425)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8426)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8427)
