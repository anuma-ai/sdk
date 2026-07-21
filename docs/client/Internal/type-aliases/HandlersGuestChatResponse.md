# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2048](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2048)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2053](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2053)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2057](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2057)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2061)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2062](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2062)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2066](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2066)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2070)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2071](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2071)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2072)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2079)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2080)
