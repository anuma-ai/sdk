# ChatMigrationResult

Defined in: [src/lib/chatStore/migrateChats.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#60)

## Properties

### conversations

> **conversations**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#62)

***

### imported

> **imported**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#64)

***

### messages

> **messages**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#63)

***

### skipped

> **skipped**: [`ChatMigrationSkip`](ChatMigrationSkip.md)\[]

Defined in: [src/lib/chatStore/migrateChats.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#65)

***

### state

> **state**: `"migrating"` | `"active"`

Defined in: [src/lib/chatStore/migrateChats.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#61)

***

### truncated

> **truncated**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#71)

Messages shrunk to fit vault's record limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#69)

Messages sent without vectors to stay inside the account's vector quota.

***

### untitled

> **untitled**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#67)

Conversations whose title could not be decrypted and went up untitled.
