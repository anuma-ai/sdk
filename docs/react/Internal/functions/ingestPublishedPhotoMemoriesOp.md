# ingestPublishedPhotoMemoriesOp

> **ingestPublishedPhotoMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `rows`: [`PublishedPhotoMemory`](../interfaces/PublishedPhotoMemory.md)\[]): `Promise`<[`PhotoIngestResult`](../interfaces/PhotoIngestResult.md)>

Defined in: [src/lib/db/memoryVault/photoIngest.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#125)

Write the published photo memories this vault does not already have.

Idempotent on `memoryId`: a row whose id is already in the vault is counted as
skipped and NOT rewritten, even when the server's text has since changed.
That is deliberate — the local row is the user's copy, they may have edited
it, and silently overwriting an edit to match the server would be the same
class of bug as publishing a version the user has since changed. Re-ingesting
changed text is a follow-up that needs a merge decision, not a clobber.

That skip is also why this op does NOT repair a row an older build stamped
`scope: "private"`. Such a row is present, so ingest leaves it alone, and it
stays outside the published-set read. The user's switch cannot revoke it.
Repair belongs in a one-time pass at upgrade. Do not add it here, for two
reasons:

* **The two states are indistinguishable from this op.** After this build a
  `photo:` row with `scope: "private"` is also exactly what the user's own
  off-toggle produces. The toggle calls `updateVaultMemoryOp`, which writes
  `scope` and never touches `visibility`, so the mis-stamped row and the
  turned-off row carry identical columns. No test here can tell them apart.

* **A re-stamp here would revert the off-toggle.** The pass runs ingest
  BEFORE it reads the vault, so a row re-stamped `shared` re-enters the
  desired set on that same pass and never reaches `toRevoke`. The switch
  would spring back to "on" and nearby would keep serving the memory. That
  is worse than the bug it repairs.

A one-time pass does not have the ambiguity. Before this build the switch
already read "off" for these rows, because it reads `scope`, so no user can
have turned one off. Every `private` photo row at that instant came from the
old stamp.

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
