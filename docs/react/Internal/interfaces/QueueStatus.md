# QueueStatus

Defined in: [src/lib/db/queue/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L50)

Status of a wallet's queue.

## Properties

### failed

> **failed**: `number`

Defined in: [src/lib/db/queue/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L54)

Number of operations that failed all retries

***

### isFlushing

> **isFlushing**: `boolean`

Defined in: [src/lib/db/queue/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L56)

Whether the queue is currently being flushed

***

### isPaused

> **isPaused**: `boolean`

Defined in: [src/lib/db/queue/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L58)

Whether the queue is paused (e.g., wallet disconnected)

***

### pending

> **pending**: `number`

Defined in: [src/lib/db/queue/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L52)

Number of pending operations
