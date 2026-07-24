# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#45)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#47)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#49)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#53)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#55)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#51)

The scope of the memory (only present for add operations)
