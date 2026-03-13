# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#22)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#24)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#26)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#30)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#32)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#28)

The scope of the memory (only present for add operations)
