# stripLegacyChunkTextOp

> **stripLegacyChunkTextOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)): `Promise`<`number`>

Defined in: [src/lib/db/chat/operations.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1119)

Removes the plaintext `text` that rows chunked before sdk#889 still carry in
their `chunks` column. Since #889 `updateMessageChunksOp` never writes it, so
a stored `text` key identifies exactly the rows written before that change.
Readers rebuild the snippet from the offsets every row already has; a row
edited after it was chunked fails `resolveChunkText`'s coverage check and
shows the whole message instead.

Every device must call it: each strips only its own local copy. Backups hold
whole rows encrypted, and a restore brings the text back until the next call.
Idempotent: a stripped row no longer matches, so calling it once per session
is safe. `updated_at` is kept as it was, so backup sync does not re-upload
every old row (the chunk vectors are most of each row's size).

Reads raw rows a page at a time and builds Models only for the rows it
changes, so unchanged candidates never enter the record cache, and each
write stays small enough not to hold up chat saves.

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

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>

Number of rows stripped.
