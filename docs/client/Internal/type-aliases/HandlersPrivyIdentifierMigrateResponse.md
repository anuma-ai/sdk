# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2225](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2225)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2229)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2233)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2234](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2234)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2235)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2236)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2237)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2238](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2238)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2242](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2242)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2243)
