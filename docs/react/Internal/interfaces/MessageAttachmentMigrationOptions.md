# MessageAttachmentMigrationOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#561)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:563](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#563)

***

### files

> **files**: readonly [`LocalMessageAttachment`](LocalMessageAttachment.md)\[]

Defined in: [src/lib/chatStore/vaultAttachments.ts:567](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#567)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:564](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#564)

***

### messageId

> **messageId**: `string`

Defined in: [src/lib/chatStore/vaultAttachments.ts:566](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#566)

The message's vault id (`StoredMessage.uniqueId`); vault must already hold it.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:568](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#568)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:569](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#569)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:562](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#562)
