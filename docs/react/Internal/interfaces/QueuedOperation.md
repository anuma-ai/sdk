# QueuedOperation

Defined in: [src/lib/db/queue/types.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L25)

A single queued database operation.

## Properties

### dependencies

> **dependencies**: `string`\[]

Defined in: [src/lib/db/queue/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L37)

IDs of operations that must complete before this one

***

### id

> **id**: `string`

Defined in: [src/lib/db/queue/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L27)

Unique ID for this operation

***

### maxRetries

> **maxRetries**: `number`

Defined in: [src/lib/db/queue/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L44)

Maximum number of retries allowed

***

### payload

> **payload**: `Record`<`string`, `any`>

Defined in: [src/lib/db/queue/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L40)

Operation-specific payload

***

### priority

> **priority**: `number`

Defined in: [src/lib/db/queue/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L35)

Priority for ordering (lower = higher priority). Conversations=0, Messages=1, Media=2

***

### retryCount

> **retryCount**: `number`

Defined in: [src/lib/db/queue/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L42)

Number of times this operation has been retried

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/db/queue/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L33)

When the operation was queued

***

### type

> **type**: [`QueuedOperationType`](../type-aliases/QueuedOperationType.md)

Defined in: [src/lib/db/queue/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L29)

Type of operation

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/queue/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#L31)

Wallet address this operation belongs to
