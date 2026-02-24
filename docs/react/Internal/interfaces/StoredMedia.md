# StoredMedia

Defined in: [src/lib/db/media/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L58)

Stored media record as returned from the database.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/media/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L68)

Associated conversation ID (for quick filtering)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/media/types.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L98)

***

### dimensions?

> `optional` **dimensions**: [`MediaDimensions`](MediaDimensions.md)

Defined in: [src/lib/db/media/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L91)

Dimensions for images/videos

***

### duration?

> `optional` **duration**: `number`

Defined in: [src/lib/db/media/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L93)

Duration in seconds for video/audio

***

### id

> **id**: `string`

Defined in: [src/lib/db/media/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L60)

WatermelonDB record ID

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/media/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L102)

***

### mediaId

> **mediaId**: `string`

Defined in: [src/lib/db/media/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L62)

Unique media ID (used as OPFS key)

***

### mediaType

> **mediaType**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [src/lib/db/media/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L76)

Categorized media type for filtering

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/db/media/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L66)

Associated message ID (if attached to a message)

***

### metadata?

> `optional` **metadata**: [`MediaMetadata`](MediaMetadata.md)

Defined in: [src/lib/db/media/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L95)

Additional metadata

***

### mimeType

> **mimeType**: `string`

Defined in: [src/lib/db/media/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L74)

MIME type (e.g., "image/png", "video/mp4")

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/media/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L84)

AI model used for generation (if AI-generated)

***

### name

> **name**: `string`

Defined in: [src/lib/db/media/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L72)

Display name of the file

***

### role

> **role**: [`MediaRole`](../type-aliases/MediaRole.md)

Defined in: [src/lib/db/media/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L82)

Role of who attached this media

***

### size

> **size**: `number`

Defined in: [src/lib/db/media/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L78)

File size in bytes

***

### sourceUrl?

> `optional` **sourceUrl**: `string`

Defined in: [src/lib/db/media/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L87)

Original external URL for cached files (MCP R2, etc.)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/media/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L99)

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#L64)

Wallet address of the user who owns this media
