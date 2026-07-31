# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2120)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2125](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2125)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2129](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2129)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2133](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2133)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2134](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2134)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2138)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2142)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2143)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2144)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2151)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2152](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2152)
