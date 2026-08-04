# StoredMessageWithSimilarity

Defined in: [src/lib/db/chat/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#313)

## Extends

* [`StoredMessage`](StoredMessage.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#238)

Chunks of this message with individual embeddings for fine-grained search

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`chunks`](StoredMessage.md#chunks)

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#223)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#233)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### decryptionStatus?

> `optional` **decryptionStatus**: `"key_missing"` | `"auth_mismatch"` | `"invalid_payload"`

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

Set when `content` could not be decrypted on read (#561).
The `content` field still holds the original ciphertext — never a
`[Decryption Failed]` placeholder — so a later unlock can recover.

* `key_missing`: no key for this field's `enc:vN:` version in the store
* `auth_mismatch`: a key was present but AES-GCM auth failed (wrong key)
* `invalid_payload`: malformed ciphertext envelope

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`decryptionStatus`](StoredMessage.md#decryptionstatus)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#236)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#244)

If set, indicates the message failed with this error

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#251)

User feedback: 'like', 'dislike', or null for no feedback

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`feedback`](StoredMessage.md#feedback)

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#232)

Array of media\_id references for direct lookup in media table

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`fileIds`](StoredMessage.md#fileids)

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#230)

**Deprecated**

Use fileIds with media table instead

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#228)

Image generation model used for this message (e.g., "nano-banana-flash")

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`imageModel`](StoredMessage.md#imagemodel)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#222)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#226)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### origin?

> `optional` **origin**: `"tool_result"`

Defined in: [src/lib/db/chat/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#255)

Provenance for synthetic rows; undefined for typed messages and pre-v44 rows

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`origin`](StoredMessage.md#origin)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#249)

Parent message ID for branching (edit/regenerate). Null for root messages.

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`parentMessageId`](StoredMessage.md#parentmessageid)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#241)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#224)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:314](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#314)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#240)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#247)

Reasoning/thinking content from models that support extended thinking

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thinking`](StoredMessage.md#thinking)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#245)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#253)

Tool call events from the backend response (for reconstructing tool call history)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`toolCallEvents`](StoredMessage.md#toolcallevents)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#234)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#239)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#235)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#242)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
