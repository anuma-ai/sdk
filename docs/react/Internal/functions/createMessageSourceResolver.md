# createMessageSourceResolver

> **createMessageSourceResolver**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)): [`VerificationSources`](../interfaces/VerificationSources.md)

Defined in: [src/lib/memory/verifySupport.ts:711](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#711)

Default [VerificationSources](../interfaces/VerificationSources.md) over the chat store: resolves a source id
to its message text, role-prefixed per LINE so the verifier can apply the same
"the USER must have said it" rule the extractor does without the message body
being able to forge a speaker. Decryption is the ops layer's job — pass the
same `StorageOperationsContext` the rest of the chat reads go through.

Returns null for an id that no longer resolves, which is the common case
rather than an error: messages are hard-deleted, and the ids on a memory are
whatever the client handed `processTurn`, which the SDK never required to be
chat rows.

Storage failures are deliberately NOT swallowed here. `getMessageOp` already
separates the two — null for "not found", a throw for a locked DB or adapter
failure — and flattening that would report a broken read as permanently
missing evidence. The throw propagates into verification, which catches it
per id and returns `unchecked`/`sources-unavailable`; nothing reaches the
caller as an exception.

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

[`VerificationSources`](../interfaces/VerificationSources.md)
