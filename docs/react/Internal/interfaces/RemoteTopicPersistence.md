# RemoteTopicPersistence

Defined in: [src/lib/memory/store/remoteTopics.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#14)

## Extended by

* [`RemoteMemoryPersistence`](RemoteMemoryPersistence.md)

## Methods

### importTopics()

> **importTopics**(`topics`: readonly `object`\[], `signal?`: `AbortSignal`): `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteTopics.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#20)

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

`topics`

</td>
<td>

readonly `object`\[]

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### putTopic()

> **putTopic**(`topic`: `Pick`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md), `"name"` | `"kind"` | `"is_deleted"`>, `expectedVersion`: `number`): `Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)>

Defined in: [src/lib/memory/store/remoteTopics.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#16)

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

`topic`

</td>
<td>

`Pick`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md), `"name"` | `"kind"` | `"is_deleted"`>

</td>
</tr>
<tr>
<td>

`expectedVersion`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)>

***

### topics()

> **topics**(): `Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)\[]>

Defined in: [src/lib/memory/store/remoteTopics.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#15)

**Returns**

`Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)\[]>
