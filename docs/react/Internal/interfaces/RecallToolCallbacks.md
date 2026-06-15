# RecallToolCallbacks

Defined in: [src/lib/memory/recallTool.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#62)

## Properties

### onChunksRetrieved()?

> `optional` **onChunksRetrieved**: (`conversationIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#64)

Called with the conversation IDs returned via the chunk lane.

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

`conversationIds`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onFactsRetrieved()?

> `optional` **onFactsRetrieved**: (`factIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#66)

Called with the fact IDs returned via the fact lane.

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

`factIds`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
