# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3968](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3968)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3969)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3970](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3970)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3977)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
