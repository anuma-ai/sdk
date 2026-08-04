# StoredChatCompletionUsage

Defined in: [src/lib/db/chat/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#125)

## Properties

### completionTokens?

> `optional` **completionTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#127)

***

### costMicroUsd?

> `optional` **costMicroUsd**: `number`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#129)

***

### creditsExhausted?

> `optional` **creditsExhausted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#134)

Per-step out-of-credits marker (ai-portal #1146): true when the run ended
via the mid-loop wrap-up. Passed through like creditsUsed (not summed) so
it reaches message.usage for the out-of-credits UX.

***

### creditsUsed?

> `optional` **creditsUsed**: `number`

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#130)

***

### promptTokens?

> `optional` **promptTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#126)

***

### totalTokens?

> `optional` **totalTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#128)
