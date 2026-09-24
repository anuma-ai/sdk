# StoredChatCompletionUsage

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#138)

## Properties

### completionTokens?

> `optional` **completionTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#140)

***

### costMicroUsd?

> `optional` **costMicroUsd**: `number`

Defined in: [src/lib/db/chat/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#142)

***

### creditsExhausted?

> `optional` **creditsExhausted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#147)

Per-step out-of-credits marker (ai-portal #1146): true when the run ended
via the mid-loop wrap-up. Passed through like creditsUsed (not summed) so
it reaches message.usage for the out-of-credits UX.

***

### creditsUsed?

> `optional` **creditsUsed**: `number`

Defined in: [src/lib/db/chat/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#143)

***

### promptTokens?

> `optional` **promptTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#139)

***

### totalTokens?

> `optional` **totalTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#141)
