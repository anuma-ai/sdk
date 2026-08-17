# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:9347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9347)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:9351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9351)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:9352](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9352)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9358)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9359)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:9360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9360)
