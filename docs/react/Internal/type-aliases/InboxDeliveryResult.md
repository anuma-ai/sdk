# InboxDeliveryResult

> **InboxDeliveryResult** = `object`

Defined in: [src/lib/chat/inbox.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#197)

Outcome of delivering one vault inbox item.

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md) | `null`

Defined in: [src/lib/chat/inbox.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#201)

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/chat/inbox.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#199)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/chat/inbox.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#202)

***

### id

> **id**: `string`

Defined in: [src/lib/chat/inbox.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#198)

***

### status

> **status**: `"stored"` | `"delivered"` | `"elsewhere"` | `"unreadable"` | `"retry"`

Defined in: [src/lib/chat/inbox.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#200)
