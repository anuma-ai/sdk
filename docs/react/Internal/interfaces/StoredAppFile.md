# StoredAppFile

Defined in: [src/lib/db/appFiles/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#9)

Plain object representation of an app file record.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/appFiles/types.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#17)

File content (UTF-8 text)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/appFiles/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#13)

The conversation this file belongs to

***

### path

> **path**: `string`

Defined in: [src/lib/db/appFiles/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#15)

Normalized file path, no leading slash (e.g. "index.html", "src/App.tsx")

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/appFiles/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#11)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/appFiles/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/types.ts#18)
