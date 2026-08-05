# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2562)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2566)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2570)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2571)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2572)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2573](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2573)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2574)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2575)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2579](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2579)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2580](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2580)
