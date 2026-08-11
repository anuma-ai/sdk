# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2667)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2671)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2675)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2676](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2676)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2677](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2677)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2678)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2679)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2680](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2680)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2684](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2684)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2685)
