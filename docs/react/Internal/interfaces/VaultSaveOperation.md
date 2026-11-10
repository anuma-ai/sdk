# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#103)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#105)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#107)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#111)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#113)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#109)

The scope of the memory (only present for add operations)
