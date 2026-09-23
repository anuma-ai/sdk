# VaultSaveOperation

Defined in: [src/lib/memoryVault/tool.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#123)

Describes a pending vault save operation for UI confirmation.

## Properties

### action

> **action**: `"update"` | `"add"`

Defined in: [src/lib/memoryVault/tool.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#125)

Whether this is a new memory or an update to an existing one

***

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/tool.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#127)

The memory content to save

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memoryVault/tool.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#131)

The ID of the memory being updated (only present for updates)

***

### previousContent?

> `optional` **previousContent**: `string`

Defined in: [src/lib/memoryVault/tool.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#133)

The previous content of the memory (only present for updates, for diff display)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#129)

The scope of the memory (only present for add operations)
