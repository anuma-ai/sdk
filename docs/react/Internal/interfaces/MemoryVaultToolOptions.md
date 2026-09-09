# MemoryVaultToolOptions

Defined in: [src/lib/memoryVault/tool.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#131)

Options for creating a memory vault tool.

## Properties

### folderMap?

> `optional` **folderMap**: `Map`<`string`, `string`>

Defined in: [src/lib/memoryVault/tool.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#152)

Map of folder names to folder IDs for auto-classification.
When provided, the LLM can specify a folderName argument.

***

### onSave()?

> `optional` **onSave**: (`operation`: [`VaultSaveOperation`](VaultSaveOperation.md)) => `Promise`<`boolean`>

Defined in: [src/lib/memoryVault/tool.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#140)

Callback invoked before each save operation.
Return `true` to confirm the save, `false` to cancel it.

When provided, the confirmation is built into the executor.
When not provided, the tool has no executor and is emitted
via onToolCall so the host app can handle it.

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

### onWritten()?

> `optional` **onWritten**: (`event`: `object`) => `void` | `Promise`<`void`>

Defined in: [src/lib/memoryVault/tool.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#178)

Fires after a NEW memory's write settles, with what was asked and what the
writer did. The host's analytics hook: `onSave` runs BEFORE the write and so
cannot tell a fresh create from a merge into an existing memory — and that
split is the one number that says whether model-initiated saves duplicate
the vault. Fires on both write paths (a `write` seam, or the direct insert
when none is supplied — reported as `create`). Not called for
`id`-addressed updates or cancelled saves. A throwing or rejecting listener
is awaited and swallowed so it can never fail the tool call.

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

`event`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`event.input`

</td>
<td>

[`VaultWriteInput`](VaultWriteInput.md)

</td>
</tr>
<tr>
<td>

`event.outcome`

</td>
<td>

[`VaultWriteOutcome`](VaultWriteOutcome.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void` | `Promise`<`void`>

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memoryVault/tool.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#146)

Scope to assign to new memories. Defaults to "private".
This is injected by the client, not controlled by the LLM.

***

### write?

> `optional` **write**: [`VaultMemoryWriter`](../type-aliases/VaultMemoryWriter.md)

Defined in: [src/lib/memoryVault/tool.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#167)

Writer for NEW memories. When set, a save without an `id` goes through it
instead of a bare `createVaultMemoryOp`, and the tool phrases its reply from
the reported action (a merge reads as "already known", not "saved").

The hooks supply a `retain()`-backed writer, which is what makes this tool
stop being a dedup bypass: until then the only thing standing between the
model and a duplicate row was the prompt asking it to pass an `id`. Omit it
(as a bare `createMemoryVaultTool(vaultCtx, …)` caller must — retain needs
embeddings) and the direct insert path is unchanged.

Updates addressed by `id` never come here: the model has already named the
row, so there is nothing to de-duplicate against.
