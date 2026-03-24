# DisplayToolMigrations

> **DisplayToolMigrations** = `object`

Defined in: [src/tools/uiInteraction.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/tools/uiInteraction.ts#71)

Migration map for a display tool.
Keys are "fromVersion->toVersion" strings (e.g. "1->2").
Each function receives the stored result at fromVersion and returns the
result upgraded to toVersion.

## Index Signature

\[`key`: `` `${number}->${number}` ``]: (`data`: `unknown`) => `unknown`

## Example

```typescript
migrations: {
  "1->2": (old) => ({ ...old, newField: old.legacyField ?? defaultValue }),
}
```
