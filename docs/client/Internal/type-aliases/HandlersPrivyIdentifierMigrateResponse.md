# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2277)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2281)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2285](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2285)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2286](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2286)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2287)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2288)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2289)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2290)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2294)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2295)
