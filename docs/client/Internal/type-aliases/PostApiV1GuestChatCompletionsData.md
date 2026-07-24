# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8455](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8455)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8459](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8459)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8460)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8466)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8467)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8468)
