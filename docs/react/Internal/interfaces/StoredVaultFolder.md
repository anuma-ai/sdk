# StoredVaultFolder

Defined in: [src/lib/db/vaultFolders/types.ts:1](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#1)

## Properties

### context

> **context**: `string` | `null`

Defined in: [src/lib/db/vaultFolders/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#16)

LLM-generated context summary for the folder

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/vaultFolders/types.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#10)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/vaultFolders/types.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#12)

***

### isSystem

> **isSystem**: `boolean`

Defined in: [src/lib/db/vaultFolders/types.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#14)

Whether this is a system-created default folder

***

### name

> **name**: `string`

Defined in: [src/lib/db/vaultFolders/types.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#5)

Folder display name

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/vaultFolders/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#7)

Scope for partitioning ("private" | "shared")

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/vaultFolders/types.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#3)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/vaultFolders/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#11)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/vaultFolders/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/types.ts#9)

Owner in multi-user server deployments; null on single-tenant client DBs.
