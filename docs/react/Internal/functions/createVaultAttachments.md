# createVaultAttachments

> **createVaultAttachments**(`options`: [`VaultAttachmentsOptions`](../interfaces/VaultAttachmentsOptions.md)): [`VaultAttachments`](../interfaces/VaultAttachments.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#92)

Creates the attachment client for one account and key; bytes are AES-GCM sealed with the ring's v3 key before upload.

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

`options`

</td>
<td>

[`VaultAttachmentsOptions`](../interfaces/VaultAttachmentsOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`VaultAttachments`](../interfaces/VaultAttachments.md)
