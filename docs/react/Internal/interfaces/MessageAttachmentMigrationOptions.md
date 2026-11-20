# MessageAttachmentMigrationOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:590](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#590)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:592](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#592)

***

### files

> **files**: readonly [`LocalMessageAttachment`](LocalMessageAttachment.md)\[]

Defined in: [src/lib/chatStore/vaultAttachments.ts:596](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#596)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:593](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#593)

***

### messageId

> **messageId**: `string`

Defined in: [src/lib/chatStore/vaultAttachments.ts:595](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#595)

The message's vault id (`StoredMessage.uniqueId`); vault must already hold it.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:597](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#597)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:598](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#598)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:591](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#591)
