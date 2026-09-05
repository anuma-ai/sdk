# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:2404](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2404)

## Properties

### choices?

> `optional` **choices**: [`OpenaiChatCompletionChoice`](OpenaiChatCompletionChoice.md)\[]

Defined in: [src/client/types.gen.ts:2409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2409)

A list of chat completion choices. Can be more than one if `n` is greater
than 1.

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2413)

The Unix timestamp (in seconds) of when the chat completion was created.

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2417)

A unique identifier for the chat completion.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:2418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2418)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2422)

The model used for the chat completion.

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2426)

The object type, which is always `chat.completion`.

***

### portal?

> `optional` **portal**: [`LlmapiPortalChatCompletionResponse`](LlmapiPortalChatCompletionResponse.md)

Defined in: [src/client/types.gen.ts:2427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2427)

***

### service\_tier?

> `optional` **service\_tier**: [`OpenaiChatCompletionServiceTier`](OpenaiChatCompletionServiceTier.md)

Defined in: [src/client/types.gen.ts:2428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2428)

***

### system\_fingerprint?

> `optional` **system\_fingerprint**: `string`

Defined in: [src/client/types.gen.ts:2435](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2435)

This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the `seed` request parameter to understand when
backend changes have been made that might impact determinism.

***

### usage?

> `optional` **usage**: [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md)

Defined in: [src/client/types.gen.ts:2436](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2436)
