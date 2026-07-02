# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:3993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3993)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3997](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3997)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:3998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3998)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4002)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4003)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4007](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4007)

Total number of tokens used in the request (prompt + completion).
