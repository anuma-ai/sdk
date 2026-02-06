# FileMetadata

Defined in: [src/lib/db/chat/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L46)

Metadata for files attached to messages.

Note the distinction between `url` and `sourceUrl`:

* `url`: Content URL that gets sent to the AI as part of the message (e.g., data URIs for user uploads)
* `sourceUrl`: Original external URL for locally-cached files (for lookup only, never sent to AI)

## Extended by

* [`StoredFileWithContext`](StoredFileWithContext.md)
* [`FileWithData`](FileWithData.md)

## Properties

### id

> **id**: `string`

Defined in: [src/lib/db/chat/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L48)

Unique identifier for the file (used as OPFS key for cached files)

***

### name

> **name**: `string`

Defined in: [src/lib/db/chat/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L50)

Display name of the file

***

### size

> **size**: `number`

Defined in: [src/lib/db/chat/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L54)

File size in bytes

***

### sourceUrl?

> `optional` **sourceUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

Original external URL for files downloaded and cached locally (e.g., from MCP R2).
Used purely for URL→OPFS mapping to enable fallback when the source returns 404.

This is metadata for local lookup only - it is NOT sent to the AI or rendered directly.
The file content is served from OPFS using the `id` field.

***

### type

> **type**: `string`

Defined in: [src/lib/db/chat/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L52)

MIME type (e.g., "image/png")

***

### url?

> `optional` **url**: `string`

Defined in: [src/lib/db/chat/types.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L62)

Content URL to include when sending this message to the AI.
When present, this URL is added as an `image_url` content part.
Typically used for user-uploaded files (data URIs) that should be sent with the message.

NOT used for MCP-cached files - those use `sourceUrl` for lookup and render from OPFS.
