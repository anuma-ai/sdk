# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:1029](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1029)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:1033](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1033)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:1037](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1037)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:1041](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1041)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:1045](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1045)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:1049](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1049)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:1053](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1053)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:1057](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1057)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:1061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1061)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:1065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1065)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:1069](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1069)

stored identifier differs from embedded (case-insensitive)
