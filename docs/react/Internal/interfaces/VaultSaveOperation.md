# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#21)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#23)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#25)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#29)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#31)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#27)

The scope of the memory (only present for add operations)
