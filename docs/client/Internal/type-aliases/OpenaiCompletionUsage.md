# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4075](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4075)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4079)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4080)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4084](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4084)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4085)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4089)

Total number of tokens used in the request (prompt + completion).
