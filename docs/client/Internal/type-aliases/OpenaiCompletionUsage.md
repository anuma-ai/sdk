# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:3851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3851)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3855)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:3856](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3856)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3860)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:3861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3861)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3865)

Total number of tokens used in the request (prompt + completion).
