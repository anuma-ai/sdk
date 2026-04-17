# ChatStorageObservable\<T>

Defined in: src/lib/storage/ChatStorageAdapter.ts:68

Minimal interface for an observable (reactive) query result.

Shaped to be compatible with RxJS-style `Observable` (which is what
WatermelonDB returns) and with a simple polling fallback, so non-reactive
backends can implement it without depending on rxjs.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

## Methods

### subscribe()

> **subscribe**(`observer`: `object`): `object`

Defined in: src/lib/storage/ChatStorageAdapter.ts:69

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

`observer`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`observer.complete?`

</td>
<td>

() => `void`

</td>
</tr>
<tr>
<td>

`observer.error?`

</td>
<td>

(`err`: `unknown`) => `void`

</td>
</tr>
<tr>
<td>

`observer.next`

</td>
<td>

(`value`: `T`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`object`

**unsubscribe()**

> **unsubscribe**: () => `void`

**Returns**

`void`
