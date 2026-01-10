# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: src/client/types.gen.ts:84

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: src/client/types.gen.ts:88

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: src/client/types.gen.ts:92

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: src/client/types.gen.ts:96

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: src/client/types.gen.ts:100

"none" | "active" | "canceling" | "past\_due" | "canceled"
