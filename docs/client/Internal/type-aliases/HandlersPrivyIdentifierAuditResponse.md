# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2326)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2330)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2334)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2338)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2342)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2346)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2350)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2354)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2358)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2362)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2366)

stored identifier differs from embedded (case-insensitive)
