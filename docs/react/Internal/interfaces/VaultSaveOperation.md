# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#115)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#117)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#119)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#123)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#125)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#121)

The scope of the memory (only present for add operations)
