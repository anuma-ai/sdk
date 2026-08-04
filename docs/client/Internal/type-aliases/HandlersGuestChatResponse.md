# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2054](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2054)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2059)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2063)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2067](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2067)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2068](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2068)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2072)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2076)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2077)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2078)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2085)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2086)
