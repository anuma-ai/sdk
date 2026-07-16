# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8350)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8354)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8355)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8361)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8362)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8363)
