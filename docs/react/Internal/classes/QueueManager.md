# QueueManager

Defined in: [src/lib/db/queue/manager.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#114)

## Constructors

### Constructor

> **new QueueManager**(): `QueueManager`

**Returns**

`QueueManager`

## Methods

### clear()

> **clear**(`walletAddress`: `string`): `void`

Defined in: [src/lib/db/queue/manager.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#321)

Clear all queued operations for a wallet.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### flush()

> **flush**(`encryptionContext`: [`QueueEncryptionContext`](../interfaces/QueueEncryptionContext.md), `executor`: [`OperationExecutor`](../type-aliases/OperationExecutor.md)): `Promise`<[`FlushResult`](../interfaces/FlushResult.md)>

Defined in: [src/lib/db/queue/manager.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#215)

Flush all queued operations for a wallet by executing them with encryption.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`encryptionContext`

</td>
<td>

[`QueueEncryptionContext`](../interfaces/QueueEncryptionContext.md)

</td>
<td>

Wallet address and signing functions for encryption

</td>
</tr>
<tr>
<td>

`executor`

</td>
<td>

[`OperationExecutor`](../type-aliases/OperationExecutor.md)

</td>
<td>

Function that executes each operation against the database

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`FlushResult`](../interfaces/FlushResult.md)>

Result with succeeded/failed operation IDs

***

### getOperations()

> **getOperations**(`walletAddress`: `string`): [`QueuedOperation`](../interfaces/QueuedOperation.md)\[]

Defined in: [src/lib/db/queue/manager.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#173)

Get all pending operations for a wallet, sorted by dependency order.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

[`QueuedOperation`](../interfaces/QueuedOperation.md)\[]

***

### getStatus()

> **getStatus**(`walletAddress`: `string`): [`QueueStatus`](../interfaces/QueueStatus.md)

Defined in: [src/lib/db/queue/manager.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#196)

Get the status of a wallet's queue.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

[`QueueStatus`](../interfaces/QueueStatus.md)

***

### hasPending()

> **hasPending**(`walletAddress`: `string`): `boolean`

Defined in: [src/lib/db/queue/manager.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#364)

Check if a wallet has any pending operations.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`

***

### onQueueChange()

> **onQueueChange**(`walletAddress`: `string`, `callback`: () => `void`): () => `void`

Defined in: [src/lib/db/queue/manager.ts:345](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#345)

Register a listener for queue changes on a wallet.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`callback`

</td>
<td>

() => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

Unsubscribe function

> (): `void`

**Returns**

`void`

***

### pause()

> **pause**(`walletAddress`: `string`): `void`

Defined in: [src/lib/db/queue/manager.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#330)

Pause the queue for a wallet (stops flush mid-way).

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### queueOperation()

> **queueOperation**(`walletAddress`: `string`, `type`: [`QueuedOperationType`](../type-aliases/QueuedOperationType.md), `payload`: `Record`<`string`, `any`>, `dependencies`: `string`\[], `maxRetries`: `number`): `string` | `null`

Defined in: [src/lib/db/queue/manager.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#130)

Queue a new operation for a wallet.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`type`

</td>
<td>

[`QueuedOperationType`](../type-aliases/QueuedOperationType.md)

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`payload`

</td>
<td>

`Record`<`string`, `any`>

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`dependencies`

</td>
<td>

`string`\[]

</td>
<td>

`[]`

</td>
</tr>
<tr>
<td>

`maxRetries`

</td>
<td>

`number`

</td>
<td>

`DEFAULT_MAX_RETRIES`

</td>
</tr>
</tbody>
</table>

**Returns**

`string` | `null`

The operation ID, or null if queue is full.

***

### removeOperation()

> **removeOperation**(`walletAddress`: `string`, `operationId`: `string`): `void`

Defined in: [src/lib/db/queue/manager.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#182)

Remove a specific operation from the queue.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`operationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### resume()

> **resume**(`walletAddress`: `string`): `void`

Defined in: [src/lib/db/queue/manager.ts:337](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/manager.ts#337)

Resume the queue for a wallet.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
