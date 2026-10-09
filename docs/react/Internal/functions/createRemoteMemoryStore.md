# createRemoteMemoryStore

> **createRemoteMemoryStore**(`options`: [`RemoteMemoryStoreOptions`](../interfaces/RemoteMemoryStoreOptions.md)): [`MemoryStore`](../interfaces/MemoryStore.md)

Defined in: [src/lib/memory/store/remoteStore.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#157)

[MemoryStore](../interfaces/MemoryStore.md) over nearby's private-memory API. Every read reaches nearby and every write
is version-guarded; content is decrypted and processed only on the device.

Differences from the local store: `createMany` above 50 memories commits in batches of 50 and
throws [RemoteMemoryPartialCreateError](../classes/RemoteMemoryPartialCreateError.md) if a later batch fails, a concurrent edit surfaces
as a `RemoteMemoryError` with code `version_conflict`, subscriptions see other devices' changes
by polling nearby for rows written since the last poll, and `addTopics` returns each topic with
its canonical name as its id. There is no `maintenance`.

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
