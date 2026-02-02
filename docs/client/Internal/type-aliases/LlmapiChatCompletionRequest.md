# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:352](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L352)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:356](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L356)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:360](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L360)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:364](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L364)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:365](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L365)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:369](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L369)

Tools is an array of tool schemas describing which tools the model can use
