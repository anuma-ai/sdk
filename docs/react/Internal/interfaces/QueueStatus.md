# QueueStatus

Defined in: [src/lib/db/queue/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#44)

Status of a wallet's queue.

## Properties

### failed

> **failed**: `number`

Defined in: [src/lib/db/queue/types.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#48)

Number of operations that failed all retries

***

### isFlushing

> **isFlushing**: `boolean`

Defined in: [src/lib/db/queue/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#50)

Whether the queue is currently being flushed

***

### isPaused

> **isPaused**: `boolean`

Defined in: [src/lib/db/queue/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#52)

Whether the queue is paused (e.g., wallet disconnected)

***

### pending

> **pending**: `number`

Defined in: [src/lib/db/queue/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#46)

Number of pending operations
