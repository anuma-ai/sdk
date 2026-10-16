# ExtractionMessageSource

Defined in: [src/lib/memory/durableExtraction.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#30)

Resolves queued ids for a conversation that does not live in local chat history.

## Methods

### load()

> **load**(`conversationId`: `string`, `ids`: `string`\[]): `Promise`<[`ExtractionSourceMessage`](ExtractionSourceMessage.md)\[]>

Defined in: [src/lib/memory/durableExtraction.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#32)

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

`ids`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ExtractionSourceMessage`](ExtractionSourceMessage.md)\[]>

***

### status()

> **status**(`conversationId`: `string`): `Promise`<[`ExtractionSourceStatus`](../type-aliases/ExtractionSourceStatus.md)>

Defined in: [src/lib/memory/durableExtraction.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#31)

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

`Promise`<[`ExtractionSourceStatus`](../type-aliases/ExtractionSourceStatus.md)>
