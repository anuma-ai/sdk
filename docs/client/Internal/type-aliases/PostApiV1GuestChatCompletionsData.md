# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:8934](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8934)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:8938](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8938)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:8939](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8939)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:8945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8945)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:8946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8946)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:8947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8947)
