# QueuedOperation

Defined in: [src/lib/db/queue/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#26)

A single queued database operation.

## Properties

### dependencies

> **dependencies**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#38)

IDs of operations that must complete before this one

***

### id

> **id**: `string`

Defined in: [src/lib/db/queue/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#28)

Unique ID for this operation

***

### maxRetries

> **maxRetries**: `number`

Defined in: [src/lib/db/queue/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#45)

Maximum number of retries allowed

***

### payload

> **payload**: `Record`<`string`, `any`>

Defined in: [src/lib/db/queue/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#41)

Operation-specific payload

***

### priority

> **priority**: `number`

Defined in: [src/lib/db/queue/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#36)

Priority for ordering (lower = higher priority). Conversations=0, Messages=1, Media=2

***

### retryCount

> **retryCount**: `number`

Defined in: [src/lib/db/queue/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#43)

Number of times this operation has been retried

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/db/queue/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#34)

When the operation was queued

***

### type

> **type**: [`QueuedOperationType`](../type-aliases/QueuedOperationType.md)

Defined in: [src/lib/db/queue/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#30)

Type of operation

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/queue/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#32)

Wallet address this operation belongs to
