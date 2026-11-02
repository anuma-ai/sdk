# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/react/useChatStorage.ts:769](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#769)

Outcome of delivering one vault inbox item with `deliverInbox`.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/react/useChatStorage.ts:773](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#773)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/react/useChatStorage.ts:771](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#771)

***

### error?

> `optional` **error**: `string`

Defined in: [src/react/useChatStorage.ts:774](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#774)

***

### id

> **id**: `string`

Defined in: [src/react/useChatStorage.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#770)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/react/useChatStorage.ts:772](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#772)
