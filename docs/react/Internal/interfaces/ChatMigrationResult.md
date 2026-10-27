# ChatMigrationResult

Defined in: [src/lib/chatStore/migrateChats.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#65)

## Properties

### conversations

> **conversations**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#67)

***

### imported

> **imported**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#69)

***

### messages

> **messages**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#68)

***

### skipped

> **skipped**: [`ChatMigrationSkip`](ChatMigrationSkip.md)\[]

Defined in: [src/lib/chatStore/migrateChats.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#70)

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: [src/lib/chatStore/migrateChats.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#66)

***

### truncated

> **truncated**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#76)

Messages shrunk to fit vault's record limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#74)

Messages sent without vectors to stay inside the account's vector quota.

***

### untitled

> **untitled**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#72)

Conversations whose title could not be decrypted and went up untitled.
