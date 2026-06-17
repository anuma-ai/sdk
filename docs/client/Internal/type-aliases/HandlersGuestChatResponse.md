# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:1949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1949)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:1954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1954)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1958)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1962)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:1963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1963)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1967](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1967)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1971)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:1972](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1972)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:1973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1973)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:1980](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1980)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:1981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1981)
