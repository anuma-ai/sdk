# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3574)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3575)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3576)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3577)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3583)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
