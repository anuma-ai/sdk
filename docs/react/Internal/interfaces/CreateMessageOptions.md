# CreateMessageOptions

Defined in: src/lib/db/chat/types.ts:108

## Properties

### content

> **content**: `string`

Defined in: src/lib/db/chat/types.ts:111

***

### conversationId

> **conversationId**: `string`

Defined in: src/lib/db/chat/types.ts:109

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: src/lib/db/chat/types.ts:118

***

### error?

> `optional` **error**: `string`

Defined in: src/lib/db/chat/types.ts:121

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:113

***

### model?

> `optional` **model**: `string`

Defined in: src/lib/db/chat/types.ts:112

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: src/lib/db/chat/types.ts:116

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: src/lib/db/chat/types.ts:110

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:115

***

### thinking?

> `optional` **thinking**: `string`

Defined in: src/lib/db/chat/types.ts:124

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:122

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: src/lib/db/chat/types.ts:114

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: src/lib/db/chat/types.ts:117

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: src/lib/db/chat/types.ts:119
