# MediaItemInput

Defined in: src/lib/chatStore/media.ts:18

## Extended by

* [`LocalMediaItem`](LocalMediaItem.md)

## Properties

### createdAt?

> `optional` **createdAt**: `number`

Defined in: src/lib/chatStore/media.ts:25

***

### localId

> **localId**: `string`

Defined in: src/lib/chatStore/media.ts:20

The device's id for the file, such as `StoredMedia.mediaId`; the vault id is derived from it.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: src/lib/chatStore/media.ts:26

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

***

### mimeType

> **mimeType**: `string`

Defined in: src/lib/chatStore/media.ts:22

***

### name

> **name**: `string`

Defined in: src/lib/chatStore/media.ts:21

***

### source

> **source**: `string`

Defined in: src/lib/chatStore/media.ts:24

The feature that made the file, such as `upload`, `studio` or `voice`.
