# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2309)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2313)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2317](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2317)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2318)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2319)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2320)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2321)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2322)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2326)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2327)
