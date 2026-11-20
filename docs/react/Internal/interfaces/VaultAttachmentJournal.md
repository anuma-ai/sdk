# VaultAttachmentJournal

Defined in: [src/lib/chatStore/vaultAttachments.ts:582](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#582)

Where a migration run keeps the reservation it is working on, so a rerun resumes it instead of uploading again.

## Methods

### get()

> **get**(`key`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:583](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#583)

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

`key`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### set()

> **set**(`key`: `string`, `attachmentId`: `string` | `null`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:584](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#584)

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

`key`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`attachmentId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
