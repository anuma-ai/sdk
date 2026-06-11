# QueueStatus

Defined in: [src/lib/db/queue/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#51)

Status of a wallet's queue.

## Properties

### failed

> **failed**: `number`

Defined in: [src/lib/db/queue/types.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#55)

Number of operations that failed all retries

***

### isFlushing

> **isFlushing**: `boolean`

Defined in: [src/lib/db/queue/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#57)

Whether the queue is currently being flushed

***

### isPaused

> **isPaused**: `boolean`

Defined in: [src/lib/db/queue/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#59)

Whether the queue is paused (e.g., wallet disconnected)

***

### pending

> **pending**: `number`

Defined in: [src/lib/db/queue/types.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/types.ts#53)

Number of pending operations
