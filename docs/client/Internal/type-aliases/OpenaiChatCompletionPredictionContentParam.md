# OpenaiChatCompletionPredictionContentParam

> **OpenaiChatCompletionPredictionContentParam** = `object`

Defined in: [src/client/types.gen.ts:3844](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3844)

Static predicted output content, such as the content of a text file that is
being regenerated.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3845](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3845)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionPredictionContentContentUnionParam`](OpenaiChatCompletionPredictionContentContentUnionParam.md)

Defined in: [src/client/types.gen.ts:3846](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3846)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3853)

The type of the predicted content you want to provide. This type is currently
always `content`.

This field can be elided, and will marshal its zero value as "content".
