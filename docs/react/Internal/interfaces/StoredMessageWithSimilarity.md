# StoredMessageWithSimilarity

Defined in: src/lib/db/chat/types.ts:81

## Extends

* [`StoredMessage`](StoredMessage.md)

## Properties

### content

> **content**: `string`

Defined in: src/lib/db/chat/types.ts:46

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:44

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: src/lib/db/chat/types.ts:49

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: src/lib/db/chat/types.ts:52

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: src/lib/db/chat/types.ts:58

If set, indicates the message failed with this error

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:48

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### messageId

> **messageId**: `number`

Defined in: src/lib/db/chat/types.ts:43

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: src/lib/db/chat/types.ts:47

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: src/lib/db/chat/types.ts:55

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: src/lib/db/chat/types.ts:45

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: src/lib/db/chat/types.ts:82

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:54

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: src/lib/db/chat/types.ts:61

Reasoning/thinking content from models that support extended thinking

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thinking`](StoredMessage.md#thinking)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:59

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### uniqueId

> **uniqueId**: `string`

Defined in: src/lib/db/chat/types.ts:42

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: src/lib/db/chat/types.ts:50

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: src/lib/db/chat/types.ts:53

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: src/lib/db/chat/types.ts:51

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: src/lib/db/chat/types.ts:56

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
