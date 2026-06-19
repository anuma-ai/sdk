# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:3874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3874)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3878)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:3879](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3879)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3883](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3883)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:3884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3884)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3888)

Total number of tokens used in the request (prompt + completion).
