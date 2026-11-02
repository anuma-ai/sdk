# ResumePendingStreamResult

> **ResumePendingStreamResult** = `object`

Defined in: [src/react/useChatStorage.ts:764](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#764)

Outcome of recovering one background turn.

* `completed` / `interrupted`: the replayed answer was stored
* `delivered`: the answer was already stored
* `expired`: the portal buffer is gone; the record was dropped
* `retry`: a transient failure; the record was kept

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/react/useChatStorage.ts:769](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#769)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:765](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#765)

***

### error?

> `optional` **error**: `string`

Defined in: [src/react/useChatStorage.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#770)

***

### inferenceId

> **inferenceId**: `string`

Defined in: [src/react/useChatStorage.ts:767](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#767)

***

### parentMessageId

> **parentMessageId**: `string`

Defined in: [src/react/useChatStorage.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#766)

***

### status

> **status**: `"completed"` | `"interrupted"` | `"delivered"` | `"expired"` | `"retry"`

Defined in: [src/react/useChatStorage.ts:768](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#768)
