# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L80)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L84)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L88)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L92)

Stream indicates if response should be streamed
