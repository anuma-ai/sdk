# StoredProject

Defined in: [src/lib/db/project/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L11)

Stored representation of a project in the database.

## Properties

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/project/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L19)

When the project was created

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/project/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L23)

Soft delete flag

***

### name

> **name**: `string`

Defined in: [src/lib/db/project/types.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L17)

Display name of the project (editable)

***

### projectId

> **projectId**: `string`

Defined in: [src/lib/db/project/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L15)

User-facing project ID (indexed for queries)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/project/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L13)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/project/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/types.ts#L21)

When the project was last updated
