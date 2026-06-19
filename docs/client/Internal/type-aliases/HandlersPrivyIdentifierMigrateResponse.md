# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2262)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2266)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2270](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2270)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2271)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2272)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2273](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2273)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2274)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2275)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2279)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2280)
