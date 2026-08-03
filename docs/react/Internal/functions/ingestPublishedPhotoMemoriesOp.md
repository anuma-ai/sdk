# ingestPublishedPhotoMemoriesOp

> **ingestPublishedPhotoMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `rows`: [`PublishedPhotoMemory`](../interfaces/PublishedPhotoMemory.md)\[]): `Promise`<[`PhotoIngestResult`](../interfaces/PhotoIngestResult.md)>

Defined in: [src/lib/db/memoryVault/photoIngest.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#98)

Write the published photo memories this vault does not already have.

Idempotent on `memoryId`: a row whose id is already in the vault is counted as
skipped and NOT rewritten, even when the server's text has since changed.
That is deliberate — the local row is the user's copy, they may have edited
it, and silently overwriting an edit to match the server would be the same
class of bug as publishing a version the user has since changed. Re-ingesting
changed text is a follow-up that needs a merge decision, not a clobber.

Non-`photo:` ids are ignored: everything else in the published set is a
client-published memory that by definition already lives in this vault (or in
another device's, which is not ours to recreate).

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

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
</tr>
<tr>
<td>

`rows`

</td>
<td>

[`PublishedPhotoMemory`](../interfaces/PublishedPhotoMemory.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`PhotoIngestResult`](../interfaces/PhotoIngestResult.md)>
