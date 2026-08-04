# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3754)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3755](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3755)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3756](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3756)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3757](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3757)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3763)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
