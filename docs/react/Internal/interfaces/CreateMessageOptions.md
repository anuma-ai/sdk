# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#455)

## Properties

### anuma?

> `optional` **anuma**: [`AnumaTurn`](AnumaTurn.md)

Defined in: [src/lib/db/chat/types.ts:485](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#485)

Anuma 1:1 turn fields; only vault chat backends store them.

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:458](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#458)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#456)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:471](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#471)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:474](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#474)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:465](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#465)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:463](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#463)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:461](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#461)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:459](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#459)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:483](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#483)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:479](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#479)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:469](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#469)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#457)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:468](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#468)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:477](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#477)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:475](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#475)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:481](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#481)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:493](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#493)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:467](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#467)

***

### vaultAttachments?

> `optional` **vaultAttachments**: [`VaultAttachmentRef`](VaultAttachmentRef.md)\[]

Defined in: [src/lib/db/chat/types.ts:466](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#466)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:470](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#470)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:472](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#472)
