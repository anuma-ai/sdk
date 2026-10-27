# ChatMigrationResult

Defined in: src/lib/chatStore/migrateChats.ts:63

## Properties

### conversations

> **conversations**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:65

***

### imported

> **imported**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:67

***

### messages

> **messages**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:66

***

### skipped

> **skipped**: [`ChatMigrationSkip`](ChatMigrationSkip.md)\[]

Defined in: src/lib/chatStore/migrateChats.ts:68

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: src/lib/chatStore/migrateChats.ts:64

***

### truncated

> **truncated**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:74

Messages shrunk to fit vault's record limit.

***

### unembedded

> **unembedded**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:72

Messages sent without vectors to stay inside the account's vector quota.

***

### untitled

> **untitled**: `number`

Defined in: src/lib/chatStore/migrateChats.ts:70

Conversations whose title could not be decrypted and went up untitled.
