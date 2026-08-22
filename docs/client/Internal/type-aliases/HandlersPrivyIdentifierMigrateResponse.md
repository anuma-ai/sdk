# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:2758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2758)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2762)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:2766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2766)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:2767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2767)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2768](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2768)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:2769](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2769)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2770)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2771)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:2775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2775)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2776](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2776)
