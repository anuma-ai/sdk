# FlushResult

Defined in: [src/lib/db/queue/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#58)

Result of a flush operation.

## Properties

### failed

> **failed**: `object`\[]

Defined in: [src/lib/db/queue/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#62)

Operations that failed with their errors

**error**

> **error**: `string`

**id**

> **id**: `string`

***

### succeeded

> **succeeded**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#60)

IDs of operations that succeeded

***

### total

> **total**: `number`

Defined in: [src/lib/db/queue/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#64)

Total number of operations attempted
