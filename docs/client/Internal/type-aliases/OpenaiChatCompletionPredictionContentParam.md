# OpenaiChatCompletionPredictionContentParam

> **OpenaiChatCompletionPredictionContentParam** = `object`

Defined in: [src/client/types.gen.ts:4101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4101)

Static predicted output content, such as the content of a text file that is
being regenerated.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4102)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionPredictionContentContentUnionParam`](OpenaiChatCompletionPredictionContentContentUnionParam.md)

Defined in: [src/client/types.gen.ts:4103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4103)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4110)

The type of the predicted content you want to provide. This type is currently
always `content`.

This field can be elided, and will marshal its zero value as "content".
