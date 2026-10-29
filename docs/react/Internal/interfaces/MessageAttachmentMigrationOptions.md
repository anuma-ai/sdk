# MessageAttachmentMigrationOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#326)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#328)

***

### files

> **files**: readonly [`LocalMessageAttachment`](LocalMessageAttachment.md)\[]

Defined in: [src/lib/chatStore/vaultAttachments.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#332)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#329)

***

### messageId

> **messageId**: `string`

Defined in: [src/lib/chatStore/vaultAttachments.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#331)

The message's vault id (`StoredMessage.uniqueId`); vault must already hold it.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#333)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#334)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#327)
