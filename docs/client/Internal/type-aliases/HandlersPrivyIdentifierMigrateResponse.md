# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2338)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2342)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2346)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2347)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2348)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2349](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2349)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2350)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2351)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2355)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2356)
