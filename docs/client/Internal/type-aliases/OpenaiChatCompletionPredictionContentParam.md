# OpenaiChatCompletionPredictionContentParam

> **OpenaiChatCompletionPredictionContentParam** = `object`

Defined in: [src/client/types.gen.ts:3889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3889)

Static predicted output content, such as the content of a text file that is
being regenerated.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3890)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionPredictionContentContentUnionParam`](OpenaiChatCompletionPredictionContentContentUnionParam.md)

Defined in: [src/client/types.gen.ts:3891](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3891)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3898)

The type of the predicted content you want to provide. This type is currently
always `content`.

This field can be elided, and will marshal its zero value as "content".
