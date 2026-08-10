# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4325)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4326)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4327)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4328)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4334)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
