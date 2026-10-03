# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2932)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2936)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2940)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2941)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2942)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2943](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2943)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2944)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2945)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2949)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2950)
