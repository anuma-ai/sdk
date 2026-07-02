# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2013](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2013)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2018)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2022)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2026)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2027)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2031](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2031)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2035)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2036](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2036)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2037](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2037)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2044](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2044)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2045](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2045)
