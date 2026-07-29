# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4141)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4145)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4146)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4150)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4151)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4155)

Total number of tokens used in the request (prompt + completion).
