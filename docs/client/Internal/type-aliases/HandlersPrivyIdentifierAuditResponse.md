# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2513)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2517)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2521)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2525)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2529)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2533)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2537)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2541)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2545)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2549)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2553)

stored identifier differs from embedded (case-insensitive)
