# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2736)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2740)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2744)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2745)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2746)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2747)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2748)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2749](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2749)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2753)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2754)
