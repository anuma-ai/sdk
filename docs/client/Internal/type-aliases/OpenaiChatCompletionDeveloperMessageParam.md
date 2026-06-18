# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3330)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3331)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3332)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3333](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3333)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3339)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
