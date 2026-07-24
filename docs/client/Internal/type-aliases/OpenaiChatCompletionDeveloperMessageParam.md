# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3561)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3562)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3563)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3564)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3570)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
