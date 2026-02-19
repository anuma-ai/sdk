# FileWithData

Defined in: [src/lib/processors/types.ts:6](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L6)

Extended file metadata with data URL for processing

## Extends

* [`FileMetadata`](FileMetadata.md)

## Properties

### dataUrl

> **dataUrl**: `string`

Defined in: [src/lib/processors/types.ts:8](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/processors/types.ts#L8)

Data URL or blob URL containing file content

***

### id

> **id**: `string`

Defined in: [src/lib/db/chat/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L55)

Unique identifier for the file (used as OPFS key for cached files)

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`id`](FileMetadata.md#id)

***

### name

> **name**: `string`

Defined in: [src/lib/db/chat/types.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L57)

Display name of the file

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`name`](FileMetadata.md#name)

***

### size

> **size**: `number`

Defined in: [src/lib/db/chat/types.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L61)

File size in bytes

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`size`](FileMetadata.md#size)

***

### sourceUrl?

> `optional` **sourceUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L77)

Original external URL for files downloaded and cached locally (e.g., from MCP R2).
Used purely for URL→OPFS mapping to enable fallback when the source returns 404.

This is metadata for local lookup only - it is NOT sent to the AI or rendered directly.
The file content is served from OPFS using the `id` field.

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`sourceUrl`](FileMetadata.md#sourceurl)

***

### type

> **type**: `string`

Defined in: [src/lib/db/chat/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L59)

MIME type (e.g., "image/png")

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`type`](FileMetadata.md#type)

***

### url?

> `optional` **url**: `string`

Defined in: [src/lib/db/chat/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L69)

Content URL to include when sending this message to the AI.
When present, this URL is added as an `image_url` content part.
Typically used for user-uploaded files (data URIs) that should be sent with the message.

NOT used for MCP-cached files - those use `sourceUrl` for lookup and render from OPFS.

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`url`](FileMetadata.md#url)
