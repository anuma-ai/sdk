# encryptMemoriesBatchInPlace()

> **encryptMemoriesBatchInPlace**(`memories`, `address`, `updateFn`, `batchSize`): `Promise`\<\{ `failed`: `string`[]; `success`: `number`; \}\>

Defined in: [src/lib/db/memory/encryption.ts:448](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L448)

Encrypt a batch of memories in parallel with rate limiting and retry logic.
Tracks failed memories for error reporting.

## Parameters

### memories

`MemoryForBatchEncryption`[]

Array of memories to encrypt

### address

`string`

User's wallet address

### updateFn

(`id`, `data`) => `Promise`\<`unknown`\>

Function to update a memory in storage

### batchSize

`number` = `5`

Number of memories to process in parallel (default: 5)

## Returns

`Promise`\<\{ `failed`: `string`[]; `success`: `number`; \}\>

Object with success count and failed memory IDs
