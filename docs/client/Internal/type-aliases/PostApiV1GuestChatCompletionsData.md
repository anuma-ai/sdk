# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:7826](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7826)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:7830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7830)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:7831](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7831)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:7837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7837)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:7838](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7838)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:7839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7839)
