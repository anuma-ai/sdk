# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2551)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2555)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2559)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2560)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2561)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2562)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2563)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2564)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2568)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2569)
