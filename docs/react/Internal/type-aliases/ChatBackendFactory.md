# ChatBackendFactory

> **ChatBackendFactory** = (`signer`: [`ChatBackendSigner`](../interfaces/ChatBackendSigner.md)) => [`ChatBackend`](../interfaces/ChatBackend.md)

Defined in: [src/lib/storage/ChatBackend.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#73)

Builds the chat backend for a signer; `useChatStorage` calls it for live writes and for queued writes replayed later.

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

`signer`

</td>
<td>

[`ChatBackendSigner`](../interfaces/ChatBackendSigner.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`ChatBackend`](../interfaces/ChatBackend.md)
