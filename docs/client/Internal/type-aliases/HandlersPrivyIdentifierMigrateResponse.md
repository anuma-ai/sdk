# HandlersPrivyIdentifierMigrateResponse

> **HandlersPrivyIdentifierMigrateResponse** = `object`

Defined in: [src/client/types.gen.ts:1078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1078)

## Properties

### changes?

> `optional` **changes**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:1082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1082)

accounts whose identifier was rewritten

***

### failed?

> `optional` **failed**: `number`

Defined in: [src/client/types.gen.ts:1086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1086)

DB update or constraint failure

***

### failures?

> `optional` **failures**: [`HandlersPrivyIdentifierMigrateFailure`](HandlersPrivyIdentifierMigrateFailure.md)\[]

Defined in: [src/client/types.gen.ts:1087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1087)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:1088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1088)

***

### migrated?

> `optional` **migrated**: `number`

Defined in: [src/client/types.gen.ts:1089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1089)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:1090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1090)

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:1091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1091)

***

### skipped?

> `optional` **skipped**: `number`

Defined in: [src/client/types.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1095)

already correct, no embedded, or Privy API miss

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:1096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1096)
