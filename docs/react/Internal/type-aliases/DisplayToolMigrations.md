# DisplayToolMigrations

> **DisplayToolMigrations** = `object`

Defined in: [src/tools/uiInteraction.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/tools/uiInteraction.ts#L74)

Migration map for a display tool.
Keys are "fromVersion->toVersion" strings (e.g. "1->2").
Each function receives the stored result at fromVersion and returns the
result upgraded to toVersion.

## Index Signature

\[`key`: `` `${number}->${number}` ``]: (`data`: `any`) => `any`

## Example

```typescript
migrations: {
  "1->2": (old) => ({ ...old, newField: old.legacyField ?? defaultValue }),
}
```
