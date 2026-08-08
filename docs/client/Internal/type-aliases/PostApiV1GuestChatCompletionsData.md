# PostApiV1GuestChatCompletionsData

> **PostApiV1GuestChatCompletionsData** = `object`

Defined in: [src/client/types.gen.ts:9115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9115)

## Properties

### body

> **body**: [`LlmapiChatCompletionRequest`](LlmapiChatCompletionRequest.md)

Defined in: [src/client/types.gen.ts:9119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9119)

Chat request (model/tools/stream fields are ignored server-side)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:9120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9120)

**X-Guest-ID**

> **X-Guest-ID**: `string`

Client-generated UUID v4 identifying the guest session

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9126](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9126)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9127)

***

### url

> **url**: `"/api/v1/guest/chat/completions"`

Defined in: [src/client/types.gen.ts:9128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9128)
