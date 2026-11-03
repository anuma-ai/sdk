# StoredMessage

Defined in: [src/lib/db/chat/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#252)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### anuma?

> `optional` **anuma**: [`AnumaTurn`](AnumaTurn.md)

Defined in: [src/lib/db/chat/types.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#290)

Anuma 1:1 turn fields; only vault chat backends store them.

***

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#271)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#257)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#255)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#266)

***

### decryptionStatus?

> `optional` **decryptionStatus**: `"key_missing"` | `"auth_mismatch"` | `"invalid_payload"`

Defined in: [src/lib/db/chat/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#299)

Set when `content` could not be decrypted on read (#561).
The `content` field still holds the original ciphertext — never a
`[Decryption Failed]` placeholder — so a later unlock can recover.

* `key_missing`: no key for this field's `enc:vN:` version in the store
* `auth_mismatch`: a key was present but AES-GCM auth failed (wrong key)
* `invalid_payload`: malformed ciphertext envelope

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#269)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#277)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#284)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#260)

Image generation model used for this message (e.g., "nano-banana-flash")

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#254)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#288)

Provenance for synthetic rows; undefined for typed messages and pre-v44 rows

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#282)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#274)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#256)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#273)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#280)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#278)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#286)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#253)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#267)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#272)

***

### vaultAttachments?

> `optional` **vaultAttachments**: [`VaultAttachmentRef`](VaultAttachmentRef.md)\[]

Defined in: [src/lib/db/chat/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#265)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#268)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#275)
