# StoredMessage

Defined in: src/lib/db/chat/types.ts:41

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: src/lib/db/chat/types.ts:46

***

### conversationId

> **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:44

***

### createdAt

> **createdAt**: `Date`

Defined in: src/lib/db/chat/types.ts:49

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: src/lib/db/chat/types.ts:52

***

### error?

> `optional` **error**: `string`

Defined in: src/lib/db/chat/types.ts:58

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:48

***

### messageId

> **messageId**: `number`

Defined in: src/lib/db/chat/types.ts:43

***

### model?

> `optional` **model**: `string`

Defined in: src/lib/db/chat/types.ts:47

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: src/lib/db/chat/types.ts:55

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: src/lib/db/chat/types.ts:45

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:54

***

### thinking?

> `optional` **thinking**: `string`

Defined in: src/lib/db/chat/types.ts:61

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:59

***

### uniqueId

> **uniqueId**: `string`

Defined in: src/lib/db/chat/types.ts:42

***

### updatedAt

> **updatedAt**: `Date`

Defined in: src/lib/db/chat/types.ts:50

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: src/lib/db/chat/types.ts:53

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: src/lib/db/chat/types.ts:51

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: src/lib/db/chat/types.ts:56
