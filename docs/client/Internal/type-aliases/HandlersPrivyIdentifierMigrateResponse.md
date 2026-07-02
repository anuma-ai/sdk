# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2320)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2324)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2328)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2329)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2330)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2331)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2332)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2333](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2333)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2337)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2338)
