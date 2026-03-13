# MemoryVaultToolOptions

Defined in: [src/lib/memoryVault/tool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#38)

Options for creating a memory vault tool.

## Properties

### folderMap?

> `optional` **folderMap**: `Map`<`string`, `string`>

Defined in: [src/lib/memoryVault/tool.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#59)

Map of folder names to folder IDs for auto-classification.
When provided, the LLM can specify a folderName argument.

***

### onSave()?

> `optional` **onSave**: (`operation`: [`VaultSaveOperation`](VaultSaveOperation.md)) => `Promise`<`boolean`>

Defined in: [src/lib/memoryVault/tool.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#47)

Callback invoked before each save operation.
Return `true` to confirm the save, `false` to cancel it.

When provided, the tool uses autoExecute with the confirmation
built into the executor. When not provided, the tool uses
autoExecute: false so the host app can handle it via onToolCall.

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

`operation`

</td>
<td>

[`VaultSaveOperation`](VaultSaveOperation.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#53)

Scope to assign to new memories. Defaults to "private".
This is injected by the client, not controlled by the LLM.
