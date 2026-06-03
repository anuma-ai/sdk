# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2079)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2083](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2083)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2087)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2091)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2095)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2099)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2103)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2107)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2111)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2115)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2119)

stored identifier differs from embedded (case-insensitive)
