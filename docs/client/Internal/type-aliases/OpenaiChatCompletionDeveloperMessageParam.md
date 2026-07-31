# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3589)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3590](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3590)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3591)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3592)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3598)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
