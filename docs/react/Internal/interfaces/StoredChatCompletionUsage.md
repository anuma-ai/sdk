# StoredChatCompletionUsage

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#156)

## Properties

### completionTokens?

> `optional` **completionTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#158)

***

### costMicroUsd?

> `optional` **costMicroUsd**: `number`

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#160)

***

### creditsExhausted?

> `optional` **creditsExhausted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#165)

Per-step out-of-credits marker (ai-portal #1146): true when the run ended
via the mid-loop wrap-up. Passed through like creditsUsed (not summed) so
it reaches message.usage for the out-of-credits UX.

***

### creditsUsed?

> `optional` **creditsUsed**: `number`

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#161)

***

### promptTokens?

> `optional` **promptTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#157)

***

### totalTokens?

> `optional` **totalTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#159)
