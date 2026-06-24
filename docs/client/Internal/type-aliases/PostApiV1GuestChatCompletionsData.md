# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7901)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7905](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7905)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:7906](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7906)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7912)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7913)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:7914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7914)
