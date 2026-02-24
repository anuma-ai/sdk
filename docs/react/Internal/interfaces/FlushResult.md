# FlushResult

Defined in: [src/lib/db/queue/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L64)

Result of a flush operation.

## Properties

### failed

> **failed**: `object`\[]

Defined in: [src/lib/db/queue/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L68)

Operations that failed with their errors

**error**

> **error**: `string`

**id**

> **id**: `string`

***

### succeeded

> **succeeded**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L66)

IDs of operations that succeeded

***

### total

> **total**: `number`

Defined in: [src/lib/db/queue/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L70)

Total number of operations attempted
