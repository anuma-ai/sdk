# RetainResult

Defined in: [src/lib/memory/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#152)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#153)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#154)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#158)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#156)

When action is 'merge' or 'update', the prior memory's id.
