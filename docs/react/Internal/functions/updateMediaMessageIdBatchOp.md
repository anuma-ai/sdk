# updateMediaMessageIdBatchOp

> **updateMediaMessageIdBatchOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `mediaIds`: `string`\[], `messageId`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#L291)

Batch update media records with a messageId.
Used to associate media records with their message after message creation.

## Parameters

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

`ctx`

</td>
<td>

[`MediaOperationsContext`](../interfaces/MediaOperationsContext.md)

</td>
<td>

Database context

</td>
</tr>
<tr>
<td>

`mediaIds`

</td>
<td>

`string`\[]

</td>
<td>

Array of mediaIds to update

</td>
</tr>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
<td>

The messageId to set on all records

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>

Number of records updated
