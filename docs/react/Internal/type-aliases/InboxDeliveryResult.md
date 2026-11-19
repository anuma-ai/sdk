# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/lib/chat/inbox.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#202)

Outcome of delivering one vault inbox item.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/lib/chat/inbox.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#206)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/chat/inbox.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#204)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/chat/inbox.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#207)

***

### id

> **id**: `string`

Defined in: [src/lib/chat/inbox.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#203)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/lib/chat/inbox.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#205)
