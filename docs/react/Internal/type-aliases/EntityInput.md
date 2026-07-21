# EntityInput

> **EntityInput** = `string` | { `kind?`: [`EntityKind`](EntityKind.md) | `string` & `object`; `name`: `string`; }

Defined in: [src/lib/db/entities/operations.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#16)

Accepted entity shape for [linkMemoryEntitiesOp](../functions/linkMemoryEntitiesOp.md). A bare string is
a name with no kind (back-compat with the original signature); the object
form carries an optional classification.
