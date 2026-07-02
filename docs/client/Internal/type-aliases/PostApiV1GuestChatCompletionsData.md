# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8119)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8123](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8123)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8124)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8130](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8130)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8131)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8132)
