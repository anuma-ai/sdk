# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3962)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3963)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3964](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3964)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3965)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
