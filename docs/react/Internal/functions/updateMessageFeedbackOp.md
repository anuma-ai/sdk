# updateMessageFeedbackOp

> **updateMessageFeedbackOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `uniqueId`: `string`, `feedback`: [`MessageFeedback`](../type-aliases/MessageFeedback.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/db/chat/operations.ts:502](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L502)

Update the feedback (like/dislike) for a message.
Each regenerated response can have its own independent feedback.

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

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
<td>

Storage operations context

</td>
</tr>
<tr>
<td>

`uniqueId`

</td>
<td>

`string`

</td>
<td>

The unique ID of the message to update

</td>
</tr>
<tr>
<td>

`feedback`

</td>
<td>

[`MessageFeedback`](../type-aliases/MessageFeedback.md)

</td>
<td>

'like', 'dislike', or null to clear feedback

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

The updated message or null if not found
