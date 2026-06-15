# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:1866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1866)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:1871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1871)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1875](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1875)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1879](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1879)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:1880](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1880)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1884)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1888)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:1889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1889)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:1890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1890)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:1897](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1897)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:1898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1898)
