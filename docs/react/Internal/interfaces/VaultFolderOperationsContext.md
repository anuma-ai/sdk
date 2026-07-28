# VaultFolderOperationsContext

Defined in: [src/lib/db/vaultFolders/operations.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#13)

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/vaultFolders/operations.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#14)

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/vaultFolders/operations.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#34)

When set, every folder read/write scopes to this user (server-side
multi-user), mirroring `VaultMemoryOperationsContext.userId`. Leaving it
`undefined` disables scoping entirely and is correct ONLY for the
physically single-tenant client DBs (one wallet per DB, rows written with
`user_id = null`). A shared multi-tenant DB MUST set it — without it
`getAllVaultFoldersOp` returns every tenant's folders and the mutating ops
accept any tenant's folder/memory id.

Scope of the guarantee: this closes the folder-side doors only. A memory's
`folder_id` is also written by `createVaultMemoryOp` /
`updateVaultMemoryOp`, which do NOT validate that the target folder
belongs to the same user, so a memory can still be filed into a foreign
folder through those paths — where the scoped cascades here will then
correctly skip it, leaving it mis-filed. Closing that requires validating
ownership at the `folder_id` write sites in `memoryVault`; see #626.

***

### vaultFolderCollection

> **vaultFolderCollection**: `Collection`<[`StoredVaultFolderModel`](../classes/StoredVaultFolderModel.md)>

Defined in: [src/lib/db/vaultFolders/operations.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#15)

***

### vaultMemoryCollection

> **vaultMemoryCollection**: `Collection`<[`StoredVaultMemoryModel`](../classes/StoredVaultMemoryModel.md)>

Defined in: [src/lib/db/vaultFolders/operations.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#16)
