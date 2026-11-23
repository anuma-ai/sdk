# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/lib/chat/inbox.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#213)

Outcome of delivering one vault inbox item.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/lib/chat/inbox.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#217)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/chat/inbox.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#215)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/chat/inbox.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#218)

***

### id

> **id**: `string`

Defined in: [src/lib/chat/inbox.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#214)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/lib/chat/inbox.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#216)
