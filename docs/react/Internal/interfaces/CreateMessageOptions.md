# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#454)

## Properties

### anuma?

> `optional` **anuma**: [`AnumaTurn`](AnumaTurn.md)

Defined in: [src/lib/db/chat/types.ts:484](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#484)

Anuma 1:1 turn fields; only vault chat backends store them.

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#457)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#455)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:470](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#470)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:473](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#473)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:464](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#464)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:462](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#462)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:460](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#460)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:458](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#458)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:482](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#482)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#478)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:468](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#468)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#456)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:467](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#467)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:476](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#476)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:474](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#474)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:480](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#480)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:492](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#492)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:466](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#466)

***

### vaultAttachments?

> `optional` **vaultAttachments**: [`VaultAttachmentRef`](VaultAttachmentRef.md)\[]

Defined in: [src/lib/db/chat/types.ts:465](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#465)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:469](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#469)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:471](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#471)
