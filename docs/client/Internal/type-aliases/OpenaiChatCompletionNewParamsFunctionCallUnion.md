# OpenaiChatCompletionNewParamsFunctionCallUnion

> **OpenaiChatCompletionNewParamsFunctionCallUnion** = `object`

Defined in: [src/client/types.gen.ts:3772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3772)

Deprecated in favor of `tool_choice`.

Controls which (if any) function is called by the model.

`none` means the model will not call a function and instead generates a message.

`auto` means the model can pick between generating a message or calling a
function.

Specifying a particular function via `{"name": "my_function"}` forces the model
to call that function.

`none` is the default when no functions are present. `auto` is the default if
functions are present.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3773)

***

### ofFunctionCallMode?

> `optional` **ofFunctionCallMode**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3774](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3774)

***

### ofFunctionCallOption?

> `optional` **ofFunctionCallOption**: [`OpenaiChatCompletionFunctionCallOptionParam`](OpenaiChatCompletionFunctionCallOptionParam.md)

Defined in: [src/client/types.gen.ts:3775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3775)
