# StoredMessage

Defined in: src/lib/db/chat/types.ts:64

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: src/lib/db/chat/types.ts:69

***

### conversationId

> **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:67

***

### createdAt

> **createdAt**: `Date`

Defined in: src/lib/db/chat/types.ts:72

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: src/lib/db/chat/types.ts:75

***

### error?

> `optional` **error**: `string`

Defined in: src/lib/db/chat/types.ts:81

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:71

***

### messageId

> **messageId**: `number`

Defined in: src/lib/db/chat/types.ts:66

***

### model?

> `optional` **model**: `string`

Defined in: src/lib/db/chat/types.ts:70

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: src/lib/db/chat/types.ts:78

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: src/lib/db/chat/types.ts:68

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:77

***

### thinking?

> `optional` **thinking**: `string`

Defined in: src/lib/db/chat/types.ts:84

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:82

***

### uniqueId

> **uniqueId**: `string`

Defined in: src/lib/db/chat/types.ts:65

***

### updatedAt

> **updatedAt**: `Date`

Defined in: src/lib/db/chat/types.ts:73

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: src/lib/db/chat/types.ts:76

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: src/lib/db/chat/types.ts:74

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: src/lib/db/chat/types.ts:79
