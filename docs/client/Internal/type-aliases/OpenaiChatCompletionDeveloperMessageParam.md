# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3536)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3537)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3538)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3539)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3545)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
