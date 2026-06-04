# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2128)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2132)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2136)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2137)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2138)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2139](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2139)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2140)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2141)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2145)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2146)
