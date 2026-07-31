# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2502)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2506)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2510)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2514)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2518)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2522)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2526)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2530](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2530)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2534)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2538)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2542](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2542)

stored identifier differs from embedded (case-insensitive)
