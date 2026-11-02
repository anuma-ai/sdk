# ResumePendingStreamResult

> **ResumePendingStreamResult** = `object`

Defined in: [src/react/useChatStorage.ts:765](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#765)

Outcome of recovering one background turn with `resumePendingStreams`.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/react/useChatStorage.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#770)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#766)

***

### error?

> `optional` **error**: `string`

Defined in: [src/react/useChatStorage.ts:771](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#771)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/react/useChatStorage.ts:768](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#768)

***

### parentMessageId

> **parentMessageId**: `string`

Defined in: [src/react/useChatStorage.ts:767](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#767)

***

### status

> **status**: `"completed"` | `"interrupted"` | `"delivered"` | `"expired"` | `"retry"`

Defined in: [src/react/useChatStorage.ts:769](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#769)
