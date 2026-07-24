# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2391)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2395)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2399](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2399)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2400](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2400)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2401](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2401)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2402)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2403)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2404](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2404)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2408](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2408)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2409)
