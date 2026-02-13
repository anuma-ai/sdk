# createMemoryVaultTool

> **createMemoryVaultTool**(`vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: [`MemoryVaultToolOptions`](../interfaces/MemoryVaultToolOptions.md)): `ToolConfig`

Defined in: [src/lib/memoryVault/tool.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/tool.ts#L70)

Creates a memory vault tool for use with chat completions.

The tool allows the LLM to save and update persistent memories.
Each operation can be intercepted for user confirmation before committing.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`vaultCtx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
<td>

Vault operations context for database access

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`MemoryVaultToolOptions`](../interfaces/MemoryVaultToolOptions.md)

</td>
<td>

Optional configuration (onSave callback for confirmation)

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

A ToolConfig that can be passed to chat completion tools

## Example

```ts
const tool = createMemoryVaultTool(vaultCtx, {
  onSave: async (op) => {
    // Show confirmation toast, return true/false
    return await showConfirmationToast(op);
  },
});

await sendMessage({
  messages: [...],
  clientTools: [tool],
});
```
