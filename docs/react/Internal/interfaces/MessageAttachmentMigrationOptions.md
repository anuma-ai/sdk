# MessageAttachmentMigrationOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#331)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#333)

***

### files

> **files**: readonly [`LocalMessageAttachment`](LocalMessageAttachment.md)\[]

Defined in: [src/lib/chatStore/vaultAttachments.ts:337](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#337)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#334)

***

### messageId

> **messageId**: `string`

Defined in: [src/lib/chatStore/vaultAttachments.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#336)

The message's vault id (`StoredMessage.uniqueId`); vault must already hold it.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:338](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#338)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:339](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#339)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#332)
