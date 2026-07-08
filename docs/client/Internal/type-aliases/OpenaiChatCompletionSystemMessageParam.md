# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3858](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3858)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3859)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3860)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3861)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3867)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
