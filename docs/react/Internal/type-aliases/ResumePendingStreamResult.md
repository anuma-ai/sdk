# ResumePendingStreamResult

> **ResumePendingStreamResult** = `object`

Defined in: [src/react/useChatStorage.ts:760](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#760)

Outcome of recovering one background turn with `resumePendingStreams`.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/react/useChatStorage.ts:765](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#765)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:761](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#761)

***

### error?

> `optional` **error**: `string`

Defined in: [src/react/useChatStorage.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#766)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/react/useChatStorage.ts:763](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#763)

***

### parentMessageId

> **parentMessageId**: `string`

Defined in: [src/react/useChatStorage.ts:762](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#762)

***

### status

> **status**: `"completed"` | `"interrupted"` | `"delivered"` | `"expired"` | `"retry"`

Defined in: [src/react/useChatStorage.ts:764](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#764)
