# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2618)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2622)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2626)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2630)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2634](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2634)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2638)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2642)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2646)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2650)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2654)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2658)

stored identifier differs from embedded (case-insensitive)
