# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2605](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2605)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2609](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2609)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2613](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2613)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2617](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2617)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2621)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2625)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2629)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2633](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2633)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2637)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2641](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2641)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2645](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2645)

stored identifier differs from embedded (case-insensitive)
