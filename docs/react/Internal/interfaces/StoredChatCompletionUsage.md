# StoredChatCompletionUsage

Defined in: [src/lib/db/chat/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#146)

## Properties

### completionTokens?

> `optional` **completionTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#148)

***

### costMicroUsd?

> `optional` **costMicroUsd**: `number`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#150)

***

### creditsExhausted?

> `optional` **creditsExhausted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#155)

Per-step out-of-credits marker (ai-portal #1146): true when the run ended
via the mid-loop wrap-up. Passed through like creditsUsed (not summed) so
it reaches message.usage for the out-of-credits UX.

***

### creditsUsed?

> `optional` **creditsUsed**: `number`

Defined in: [src/lib/db/chat/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#151)

***

### promptTokens?

> `optional` **promptTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#147)

***

### totalTokens?

> `optional` **totalTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#149)
