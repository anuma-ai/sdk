# MediaSeedOptions

Defined in: [src/lib/chatStore/media.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#77)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/media.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#79)

***

### items

> **items**: readonly [`LocalMediaItem`](LocalMediaItem.md)\[]

Defined in: [src/lib/chatStore/media.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#82)

***

### journal

> **journal**: [`VaultAttachmentJournal`](VaultAttachmentJournal.md)

Defined in: [src/lib/chatStore/media.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#81)

Keeps each item's reservation so a rerun after a crash resumes it instead of uploading again.

***

### maxUploads?

> `optional` **maxUploads**: `number`

Defined in: [src/lib/chatStore/media.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#84)

Uploads at most this many files per run; rerun while `remaining` is above 0. Defaults to 20.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/media.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#85)

**Returns**

`number`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/media.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#86)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/media.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#78)
