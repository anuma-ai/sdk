# StoredMessage

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#231)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#249)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#236)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#234)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#244)

***

### decryptionStatus?

> `optional` **decryptionStatus**: `"key_missing"` | `"auth_mismatch"` | `"invalid_payload"`

Defined in: [src/lib/db/chat/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#275)

Set when `content` could not be decrypted on read (#561).
The `content` field still holds the original ciphertext — never a
`[Decryption Failed]` placeholder — so a later unlock can recover.

* `key_missing`: no key for this field's `enc:vN:` version in the store
* `auth_mismatch`: a key was present but AES-GCM auth failed (wrong key)
* `invalid_payload`: malformed ciphertext envelope

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#247)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#255)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#243)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#241)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#239)

Image generation model used for this message (e.g., "nano-banana-flash")

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#233)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#237)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#266)

Provenance for synthetic rows; undefined for typed messages and pre-v44 rows

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#260)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#252)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#235)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#251)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#256)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#232)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#245)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#250)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#246)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#253)
