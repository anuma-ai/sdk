# ExtractionCursorStore

Defined in: [src/lib/memory/autoExtractWorker.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#120)

Durable per-conversation extraction cursor. Synchronous by contract (both
SDK platform stores — web `localStorage`, mobile MMKV — are sync), so the
worker can hydrate the watermark inline without changing its fire-and-forget
control flow. Implementations should be best-effort; the worker guards every
call, so a throwing store degrades to in-memory-only rather than breaking
extraction.

## Methods

### get()

> **get**(`conversationId`: `string`): `string` | `undefined`

Defined in: [src/lib/memory/autoExtractWorker.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#122)

Last message id extracted through for `conversationId`, or undefined.

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string` | `undefined`

***

### set()

> **set**(`conversationId`: `string`, `messageId`: `string`): `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#124)

Persist the last-extracted message id for `conversationId`.

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
