# OpenaiChatCompletionToolChoiceOptionUnionParam

> **OpenaiChatCompletionToolChoiceOptionUnionParam** = `object`

Defined in: [src/client/types.gen.ts:3809](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3809)

Controls which (if any) tool is called by the model. `none` means the model will
not call any tool and instead generates a message. `auto` means the model can
pick between generating a message or calling one or more tools. `required` means
the model must call one or more tools. Specifying a particular tool via
`{"type": "function", "function": {"name": "my_function"}}` forces the model to
call that tool.

`none` is the default when no tools are present. `auto` is the default if tools
are present.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3810)

***

### ofAuto?

> `optional` **ofAuto**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3811)

***

### ofChatCompletionNamedToolChoice?

> `optional` **ofChatCompletionNamedToolChoice**: [`OpenaiChatCompletionNamedToolChoiceParam`](OpenaiChatCompletionNamedToolChoiceParam.md)

Defined in: [src/client/types.gen.ts:3812](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3812)
