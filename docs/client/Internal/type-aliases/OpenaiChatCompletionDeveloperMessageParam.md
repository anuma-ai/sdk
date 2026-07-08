# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3457)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3458)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3459](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3459)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3460)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3466)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
