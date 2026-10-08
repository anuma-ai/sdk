# StoredMedia

Defined in: [src/lib/db/media/types.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#53)

Stored media record as returned from the database.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/media/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#63)

Associated conversation ID (for quick filtering)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/media/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#89)

***

### dimensions?

> `optional` **dimensions**: [`MediaDimensions`](MediaDimensions.md)

Defined in: [src/lib/db/media/types.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#83)

Dimensions for images/videos

***

### duration?

> `optional` **duration**: `number`

Defined in: [src/lib/db/media/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#85)

Duration in seconds for video/audio

***

### id

> **id**: `string`

Defined in: [src/lib/db/media/types.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#55)

WatermelonDB record ID

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/media/types.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#92)

***

### mediaId

> **mediaId**: `string`

Defined in: [src/lib/db/media/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#57)

Unique media ID (used as OPFS key)

***

### mediaType

> **mediaType**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [src/lib/db/media/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#70)

Categorized media type for filtering

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/db/media/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#61)

Associated message ID (if attached to a message)

***

### metadata?

> `optional` **metadata**: [`MediaMetadata`](MediaMetadata.md)

Defined in: [src/lib/db/media/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#87)

Additional metadata

***

### mimeType

> **mimeType**: `string`

Defined in: [src/lib/db/media/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#68)

MIME type (e.g., "image/png", "video/mp4")

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/media/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#77)

AI model used for generation (if AI-generated)

***

### name

> **name**: `string`

Defined in: [src/lib/db/media/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#66)

Display name of the file

***

### role

> **role**: [`MediaRole`](../type-aliases/MediaRole.md)

Defined in: [src/lib/db/media/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#75)

Role of who attached this media

***

### size

> **size**: `number`

Defined in: [src/lib/db/media/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#72)

File size in bytes

***

### sourceUrl?

> `optional` **sourceUrl**: `string`

Defined in: [src/lib/db/media/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#80)

Original external URL for cached files (MCP R2, etc.)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/media/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#90)

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#59)

Wallet address of the user who owns this media
