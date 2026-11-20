# MediaSeedOptions

Defined in: [src/lib/chatStore/media.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#76)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/media.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#78)

***

### items

> **items**: readonly [`LocalMediaItem`](LocalMediaItem.md)\[]

Defined in: [src/lib/chatStore/media.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#81)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/media.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#80)

Keeps each item's reservation so a rerun after a crash resumes it instead of uploading again.

***

### maxUploads?

> `optional` **maxUploads**: `number`

Defined in: [src/lib/chatStore/media.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#83)

Uploads at most this many files per run; rerun while `remaining` is above 0. Defaults to 20.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/media.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#84)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/media.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#85)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/media.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#77)
