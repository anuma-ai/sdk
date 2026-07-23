# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2385)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2389)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2393)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2394)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2395)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2396)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2397](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2397)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2398)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2402)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2403)
