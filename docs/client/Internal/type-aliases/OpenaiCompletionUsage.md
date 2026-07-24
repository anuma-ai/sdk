# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4105)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4109](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4109)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4110)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4114](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4114)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4115)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4119)

Total number of tokens used in the request (prompt + completion).
