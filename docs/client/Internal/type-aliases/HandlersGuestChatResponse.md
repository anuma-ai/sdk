# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2266)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2271)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2275)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2279)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2280)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2284](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2284)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2288)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2289)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2290)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2297](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2297)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2298)
