# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2405)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2409)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2413)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2414)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2415](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2415)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2416](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2416)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2417)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2418)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2422)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2423)
