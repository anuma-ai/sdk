# StoredChatCompletionUsage

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#108)

## Properties

### completionTokens?

> `optional` **completionTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#110)

***

### costMicroUsd?

> `optional` **costMicroUsd**: `number`

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#112)

***

### creditsExhausted?

> `optional` **creditsExhausted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#117)

Per-step out-of-credits marker (ai-portal #1146): true when the run ended
via the mid-loop wrap-up. Passed through like creditsUsed (not summed) so
it reaches message.usage for the out-of-credits UX.

***

### creditsUsed?

> `optional` **creditsUsed**: `number`

Defined in: [src/lib/db/chat/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#113)

***

### promptTokens?

> `optional` **promptTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#109)

***

### totalTokens?

> `optional` **totalTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#111)
