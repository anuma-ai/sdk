# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2654)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2658)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2662)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2663)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2664](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2664)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2665](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2665)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2666)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2667)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2671)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2672)
