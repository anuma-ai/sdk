# OperationExecutor

> **OperationExecutor** = (`operation`: [`QueuedOperation`](../interfaces/QueuedOperation.md), `encryptionContext`: [`QueueEncryptionContext`](../interfaces/QueueEncryptionContext.md)) => `Promise`<`void`>

Defined in: [src/lib/db/queue/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/queue/types.ts#L86)

Executor function that runs a single queued operation.
Provided by the consumer (e.g., useChatStorage) during flush.

## Parameters

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

`operation`

</td>
<td>

[`QueuedOperation`](../interfaces/QueuedOperation.md)

</td>
</tr>
<tr>
<td>

`encryptionContext`

</td>
<td>

[`QueueEncryptionContext`](../interfaces/QueueEncryptionContext.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`void`>
