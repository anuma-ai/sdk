# createRemoteMemoryStore

> **createRemoteMemoryStore**(`options`: [`RemoteMemoryStoreOptions`](../interfaces/RemoteMemoryStoreOptions.md)): [`MemoryStore`](../interfaces/MemoryStore.md)

Defined in: [src/lib/memory/store/remoteStore.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#101)

[MemoryStore](../interfaces/MemoryStore.md) over nearby's private-memory API. Every read reaches nearby and every write
is version-guarded; content is decrypted and processed only on the device.

Differences from the local store: list and topic reads enumerate the vault and filter on the
device, `createMany` accepts at most 50 memories, a concurrent edit surfaces as a
`RemoteMemoryError` with code `version_conflict`, and subscriptions see other devices' changes
by polling. There is no `maintenance`.

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

[`RemoteMemoryStoreOptions`](../interfaces/RemoteMemoryStoreOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`MemoryStore`](../interfaces/MemoryStore.md)
