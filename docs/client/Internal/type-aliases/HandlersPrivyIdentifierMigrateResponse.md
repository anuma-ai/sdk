# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2248)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2252)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2256)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2257)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2258)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2259](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2259)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2260)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2261)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2265)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2266)
