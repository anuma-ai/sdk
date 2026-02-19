# MemoryVaultToolOptions

Defined in: [src/lib/memoryVault/tool.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/tool.ts#L37)

Options for creating a memory vault tool.

## Properties

### onSave()?

> `optional` **onSave**: (`operation`: [`VaultSaveOperation`](VaultSaveOperation.md)) => `Promise`<`boolean`>

Defined in: [src/lib/memoryVault/tool.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/tool.ts#L46)

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

Defined in: [src/lib/memoryVault/tool.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/tool.ts#L52)

Scope to assign to new memories. Defaults to "private".
This is injected by the client, not controlled by the LLM.
