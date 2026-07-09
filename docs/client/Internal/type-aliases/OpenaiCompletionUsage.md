# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4030)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4034)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4035)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4039)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4040](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4040)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4044](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4044)

Total number of tokens used in the request (prompt + completion).
