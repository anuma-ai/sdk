# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#94)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#96)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#98)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#102)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#104)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#100)

The scope of the memory (only present for add operations)
