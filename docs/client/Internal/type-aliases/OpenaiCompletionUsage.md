# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:3981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3981)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3985)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:3986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3986)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3990)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:3991](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3991)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3995](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3995)

Total number of tokens used in the request (prompt + completion).
