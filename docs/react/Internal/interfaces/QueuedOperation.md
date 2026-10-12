# QueuedOperation

Defined in: [src/lib/db/queue/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#19)

A single queued database operation.

## Properties

### dependencies

> **dependencies**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#31)

IDs of operations that must complete before this one

***

### id

> **id**: `string`

Defined in: [src/lib/db/queue/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#21)

Unique ID for this operation

***

### maxRetries

> **maxRetries**: `number`

Defined in: [src/lib/db/queue/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#38)

Maximum number of retries allowed

***

### payload

> **payload**: `Record`<`string`, `any`>

Defined in: [src/lib/db/queue/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#34)

Operation-specific payload

***

### priority

> **priority**: `number`

Defined in: [src/lib/db/queue/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#29)

Priority for ordering (lower = higher priority). Conversations=0, Messages=1, Media=2

***

### retryCount

> **retryCount**: `number`

Defined in: [src/lib/db/queue/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#36)

Number of times this operation has been retried

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/db/queue/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#27)

When the operation was queued

***

### type

> **type**: [`QueuedOperationType`](../type-aliases/QueuedOperationType.md)

Defined in: [src/lib/db/queue/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#23)

Type of operation

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/queue/types.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#25)

Wallet address this operation belongs to
