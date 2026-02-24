# UseICloudBackupOptions

Defined in: [src/react/useICloudBackup.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L21)

Options for useICloudBackup hook

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useICloudBackup.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L23)

WatermelonDB database instance

***

### exportConversation()

> **exportConversation**: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

Defined in: [src/react/useICloudBackup.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L29)

Export a conversation to an encrypted blob

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`userAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

***

### importConversation()

> **importConversation**: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>

Defined in: [src/react/useICloudBackup.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L34)

Import a conversation from an encrypted blob

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

`blob`

</td>
<td>

`Blob`

</td>
</tr>
<tr>
<td>

`userAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<{ `success`: `boolean`; }>

***

### requestEncryptionKey()

> **requestEncryptionKey**: (`address`: `string`) => `Promise`<`void`>

Defined in: [src/react/useICloudBackup.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L27)

Request encryption key for the user address

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

`address`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### userAddress

> **userAddress**: `string` | `null`

Defined in: [src/react/useICloudBackup.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#L25)

Current user address (null if not signed in)
