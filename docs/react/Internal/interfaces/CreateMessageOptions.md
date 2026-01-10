# CreateMessageOptions

Defined in: src/lib/db/chat/types.ts:85

## Properties

### content

> **content**: `string`

Defined in: src/lib/db/chat/types.ts:88

***

### conversationId

> **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:86

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: src/lib/db/chat/types.ts:95

***

### error?

> `optional` **error**: `string`

Defined in: src/lib/db/chat/types.ts:98

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:90

***

### model?

> `optional` **model**: `string`

Defined in: src/lib/db/chat/types.ts:89

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: src/lib/db/chat/types.ts:93

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: src/lib/db/chat/types.ts:87

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:92

***

### thinking?

> `optional` **thinking**: `string`

Defined in: src/lib/db/chat/types.ts:101

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:99

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: src/lib/db/chat/types.ts:91

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: src/lib/db/chat/types.ts:94

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: src/lib/db/chat/types.ts:96
