# FlushResult

Defined in: [src/lib/db/queue/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#65)

Result of a flush operation.

## Properties

### failed

> **failed**: `object`\[]

Defined in: [src/lib/db/queue/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#69)

Operations that failed with their errors

**error**

> **error**: `string`

**id**

> **id**: `string`

***

### succeeded

> **succeeded**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#67)

IDs of operations that succeeded

***

### total

> **total**: `number`

Defined in: [src/lib/db/queue/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#71)

Total number of operations attempted
