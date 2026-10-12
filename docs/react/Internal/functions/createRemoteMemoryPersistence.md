# createRemoteMemoryPersistence

> **createRemoteMemoryPersistence**(`options`: [`RemoteMemoryPersistenceOptions`](../interfaces/RemoteMemoryPersistenceOptions.md)): `Promise`<[`RemoteMemoryPersistence`](../interfaces/RemoteMemoryPersistence.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#299)

Connect to an already-active account. Encryption/key failures fail closed; a
failed write is never replayed automatically because its outcome may be unknown.

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

`options`

</td>
<td>

[`RemoteMemoryPersistenceOptions`](../interfaces/RemoteMemoryPersistenceOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`RemoteMemoryPersistence`](../interfaces/RemoteMemoryPersistence.md)>
