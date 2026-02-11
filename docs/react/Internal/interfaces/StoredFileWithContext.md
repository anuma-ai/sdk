# StoredFileWithContext

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)

File metadata with conversation context for file browsing.
Extends FileMetadata with information about where the file was used.

## Extends

* [`FileMetadata`](FileMetadata.md)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L171)

ID of the conversation where this file was attached

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L173)

Timestamp when the file was stored (from the message)

***

### id

> **id**: `string`

Defined in: [src/lib/db/chat/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L48)

Unique identifier for the file (used as OPFS key for cached files)

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`id`](FileMetadata.md#id)

***

### messageRole

> **messageRole**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:175](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L175)

Role of the message that contains this file

***

### name

> **name**: `string`

Defined in: [src/lib/db/chat/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L50)

Display name of the file

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`name`](FileMetadata.md#name)

***

### size

> **size**: `number`

Defined in: [src/lib/db/chat/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L54)

File size in bytes

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`size`](FileMetadata.md#size)

***

### sourceUrl?

> `optional` **sourceUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

Original external URL for files downloaded and cached locally (e.g., from MCP R2).
Used purely for URL→OPFS mapping to enable fallback when the source returns 404.

This is metadata for local lookup only - it is NOT sent to the AI or rendered directly.
The file content is served from OPFS using the `id` field.

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`sourceUrl`](FileMetadata.md#sourceurl)

***

### type

> **type**: `string`

Defined in: [src/lib/db/chat/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L52)

MIME type (e.g., "image/png")

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`type`](FileMetadata.md#type)

***

### url?

> `optional` **url**: `string`

Defined in: [src/lib/db/chat/types.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L62)

Content URL to include when sending this message to the AI.
When present, this URL is added as an `image_url` content part.
Typically used for user-uploaded files (data URIs) that should be sent with the message.

NOT used for MCP-cached files - those use `sourceUrl` for lookup and render from OPFS.

**Inherited from**

[`FileMetadata`](FileMetadata.md).[`url`](FileMetadata.md#url)
