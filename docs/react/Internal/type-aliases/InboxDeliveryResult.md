# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/lib/chat/inbox.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#154)

Outcome of delivering one vault inbox item.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/lib/chat/inbox.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#158)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/chat/inbox.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#156)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/chat/inbox.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#159)

***

### id

> **id**: `string`

Defined in: [src/lib/chat/inbox.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#155)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/lib/chat/inbox.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#157)
