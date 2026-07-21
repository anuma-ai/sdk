# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2380)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2384)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2388)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2389)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2390)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2391)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2392)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2393)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2397](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2397)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2398)
