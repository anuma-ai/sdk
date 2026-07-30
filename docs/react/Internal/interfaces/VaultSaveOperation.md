# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#78)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#80)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#82)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#86)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#88)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#84)

The scope of the memory (only present for add operations)
