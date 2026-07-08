# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2328)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2332)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2336)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2337)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2338)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2339)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2340](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2340)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2341](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2341)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2345](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2345)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2346)
