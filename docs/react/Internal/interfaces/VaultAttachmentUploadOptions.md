# VaultAttachmentUploadOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#48)

## Properties

### onReserved()?

> `optional` **onReserved**: (`attachmentId`: `string`) => `void` | `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#51)

Runs before any bytes leave the device, again for each new reservation.

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

`attachmentId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void` | `Promise`<`void`>

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/vaultAttachments.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#49)
