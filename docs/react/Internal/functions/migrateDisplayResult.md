# migrateDisplayResult

> **migrateDisplayResult**(`result`: `any`, `fromVersion`: `number`, `toVersion`: `number`, `migrations`: [`DisplayToolMigrations`](../type-aliases/DisplayToolMigrations.md)): `any`

Defined in: [src/tools/uiInteraction.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/tools/uiInteraction.ts#L115)

Migrate a stored display result from an older version to the current version.

Runs the migration chain step-by-step: fromVersion → fromVersion+1 → … → toVersion.
Steps with no registered migration function are skipped (result passes through unchanged).
Returns the original result unchanged if fromVersion >= toVersion.

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

`result`

</td>
<td>

`any`

</td>
</tr>
<tr>
<td>

`fromVersion`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`toVersion`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`migrations`

</td>
<td>

[`DisplayToolMigrations`](../type-aliases/DisplayToolMigrations.md)

</td>
</tr>
</tbody>
</table>

## Returns

`any`

## Example

```typescript
const migrated = migrateDisplayResult(storedResult, 1, 3, {
  "1->2": (v1) => ({ ...v1, added: v1.old ?? 0 }),
  "2->3": (v2) => ({ ...v2, renamed: v2.added }),
});
```
