# MediaItemInput

Defined in: [src/lib/chatStore/media.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#20)

## Extended by

* [`LocalMediaItem`](LocalMediaItem.md)

## Properties

### createdAt?

> `optional` **createdAt**: `number`

Defined in: [src/lib/chatStore/media.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#27)

***

### localId

> **localId**: `string`

Defined in: [src/lib/chatStore/media.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#22)

The device's id for the file, such as `StoredMedia.mediaId`; the vault id is derived from it.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/lib/chatStore/media.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#28)

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

***

### mimeType

> **mimeType**: `string`

Defined in: [src/lib/chatStore/media.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#24)

***

### name

> **name**: `string`

Defined in: [src/lib/chatStore/media.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#23)

***

### source

> **source**: `string`

Defined in: [src/lib/chatStore/media.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#26)

The feature that made the file, such as `upload`, `studio` or `voice`.
