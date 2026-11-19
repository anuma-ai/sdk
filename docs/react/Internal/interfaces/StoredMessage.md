# StoredMessage

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### anuma?

> `optional` **anuma**: [`AnumaTurn`](AnumaTurn.md)

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

Anuma 1:1 turn fields; only vault chat backends store them.

***

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#281)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#267)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#265)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#276)

***

### decryptionStatus?

> `optional` **decryptionStatus**: `"key_missing"` | `"auth_mismatch"` | `"invalid_payload"`

Defined in: [src/lib/db/chat/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#309)

Set when `content` could not be decrypted on read (#561).
The `content` field still holds the original ciphertext — never a
`[Decryption Failed]` placeholder — so a later unlock can recover.

* `key_missing`: no key for this field's `enc:vN:` version in the store
* `auth_mismatch`: a key was present but AES-GCM auth failed (wrong key)
* `invalid_payload`: malformed ciphertext envelope

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#279)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#287)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#294)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#274)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#272)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#270)

Image generation model used for this message (e.g., "nano-banana-flash")

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#268)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#298)

Provenance for synthetic rows; undefined for typed messages and pre-v44 rows

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#292)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#284)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#266)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#283)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#290)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#288)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#296)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#263)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#277)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#282)

***

### vaultAttachments?

> `optional` **vaultAttachments**: [`VaultAttachmentRef`](VaultAttachmentRef.md)\[]

Defined in: [src/lib/db/chat/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#275)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#278)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#285)
