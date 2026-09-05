# HandlersPrivyIdentifierAuditResponse

> **HandlersPrivyIdentifierAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2883](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2883)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2887](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2887)

current identifier already matches embedded

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2891](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2891)

transient Privy API failures

***

### entries?

> `optional` **entries**: [`HandlersPrivyIdentifierAuditEntry`](HandlersPrivyIdentifierAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2895](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2895)

only includes WillChange entries

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2899)

limit applied to this request

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2903)

offset to pass next call; -1 when no more accounts remain

***

### no\_embedded?

> `optional` **no\_embedded**: `number`

Defined in: [src/client/types.gen.ts:2907](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2907)

user exists but has no embedded wallet

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2911](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2911)

Privy API 404 for this DID

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2915](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2915)

offset applied to this request

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2919](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2919)

accounts processed in this batch

***

### will\_change?

> `optional` **will\_change**: `number`

Defined in: [src/client/types.gen.ts:2923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2923)

stored identifier differs from embedded (case-insensitive)
