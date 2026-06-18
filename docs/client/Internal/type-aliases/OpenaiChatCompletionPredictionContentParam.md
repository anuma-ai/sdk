# OpenaiChatCompletionPredictionContentParam

> **OpenaiChatCompletionPredictionContentParam** = `object`

Defined in: [src/client/types.gen.ts:3688](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3688)

Static predicted output content, such as the content of a text file that is
being regenerated.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3689)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionPredictionContentContentUnionParam`](OpenaiChatCompletionPredictionContentContentUnionParam.md)

Defined in: [src/client/types.gen.ts:3690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3690)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3697)

The type of the predicted content you want to provide. This type is currently
always `content`.

This field can be elided, and will marshal its zero value as "content".
