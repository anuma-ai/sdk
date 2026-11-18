# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/lib/chat/inbox.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#171)

Outcome of delivering one vault inbox item.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/lib/chat/inbox.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#175)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/chat/inbox.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#173)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/chat/inbox.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#176)

***

### id

> **id**: `string`

Defined in: [src/lib/chat/inbox.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#172)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/lib/chat/inbox.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#174)
