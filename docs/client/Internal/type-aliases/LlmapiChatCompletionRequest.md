# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:235](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L235)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:239](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L239)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:243](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L243)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:247](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L247)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L248)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:252](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L252)

Tools is an array of tool schemas describing which tools the model can use
