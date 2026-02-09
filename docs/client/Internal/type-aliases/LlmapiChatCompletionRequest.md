# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:455](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L455)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:459](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L459)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:463](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L463)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:467](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L467)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:468](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L468)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:472](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L472)

Tools is an array of tool schemas describing which tools the model can use
