# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2219](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2219)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2224](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2224)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2228)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2232)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2233)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2237)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2241)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2242](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2242)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2243)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2250)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2251](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2251)
