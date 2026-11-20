# LocalMediaItem

Defined in: src/lib/chatStore/media.ts:67

## Extends

* [`MediaItemInput`](MediaItemInput.md)

## Properties

### createdAt?

> `optional` **createdAt**: `number`

Defined in: src/lib/chatStore/media.ts:25

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`createdAt`](MediaItemInput.md#createdat)

***

### localId

> **localId**: `string`

Defined in: src/lib/chatStore/media.ts:20

The device's id for the file, such as `StoredMedia.mediaId`; the vault id is derived from it.

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`localId`](MediaItemInput.md#localid)

***

### metadata?

> `optional` **metadata**: `object`

Defined in: src/lib/chatStore/media.ts:26

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`metadata`](MediaItemInput.md#metadata)

***

### mimeType

> **mimeType**: `string`

Defined in: src/lib/chatStore/media.ts:22

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`mimeType`](MediaItemInput.md#mimetype)

***

### name

> **name**: `string`

Defined in: src/lib/chatStore/media.ts:21

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`name`](MediaItemInput.md#name)

***

### source

> **source**: `string`

Defined in: src/lib/chatStore/media.ts:24

The feature that made the file, such as `upload`, `studio` or `voice`.

**Inherited from**

[`MediaItemInput`](MediaItemInput.md).[`source`](MediaItemInput.md#source)

## Methods

### read()

> **read**(): `Promise`<`Blob` | `Uint8Array`<`ArrayBufferLike`> | `null`>

Defined in: src/lib/chatStore/media.ts:68

**Returns**

`Promise`<`Blob` | `Uint8Array`<`ArrayBufferLike`> | `null`>
