# MessageAttachmentMigrationOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:595](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#595)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:597](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#597)

***

### files

> **files**: readonly [`LocalMessageAttachment`](LocalMessageAttachment.md)\[]

Defined in: [src/lib/chatStore/vaultAttachments.ts:601](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#601)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:598](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#598)

***

### messageId

> **messageId**: `string`

Defined in: [src/lib/chatStore/vaultAttachments.ts:600](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#600)

The message's vault id (`StoredMessage.uniqueId`); vault must already hold it.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:602](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#602)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:603](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#603)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:596](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#596)
