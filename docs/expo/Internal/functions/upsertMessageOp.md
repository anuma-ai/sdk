# upsertMessageOp

> **upsertMessageOp**(`ctx`: [`StorageOperationsContext`](../../../react/Internal/interfaces/StorageOperationsContext.md), `opts`: [`CreateMessageOptions`](../../../react/Internal/interfaces/CreateMessageOptions.md) & `object`): `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:654](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#654)

Create-or-update a message keyed by `opts.uniqueId`.

This is the reconciliation primitive behind detach → resume. When a stream
is detached, the SDK persists the partial assistant row under a caller-owned
`assistantUniqueId`. A later resume completes that same row — it must NOT
create a second assistant message. WatermelonDB's `create()` throws on a
duplicate id, which is exactly the race this op resolves: it `find()`s the
existing row and `update()`s it in place, or `create()`s it when absent.

The result is the single-assistant-row invariant: for a given
`assistantUniqueId`, abort-then-resume yields one row, updated, never two.

`uniqueId` is required (it's the reconciliation key). On UPDATE the work is
delegated to the `_updateMessageOp` machinery, whose `!== undefined` field
guards are load-bearing for the clear: the resume path passes
`wasStopped: false` to CLEAR an earlier interrupted finalization's stopped
flag — `_updateMessageOp` honors the explicit `false`, where the create
path's truthy guard would not. On CREATE (the first persist for an id) there
is no prior flag to clear and the `was_stopped` column defaults false, so the
asymmetry is invisible. `message_id` (the conversation ordinal) is left
untouched by the update path.

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

`ctx`

</td>
<td>

[`StorageOperationsContext`](../../../react/Internal/interfaces/StorageOperationsContext.md)

</td>
</tr>
<tr>
<td>

`opts`

</td>
<td>

[`CreateMessageOptions`](../../../react/Internal/interfaces/CreateMessageOptions.md) & `object`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)>
