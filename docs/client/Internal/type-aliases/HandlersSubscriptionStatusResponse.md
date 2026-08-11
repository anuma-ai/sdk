# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:3035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3035)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:3039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3039)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:3043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3043)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:3047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3047)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:3051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3051)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:3055](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3055)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:3059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3059)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:3063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3063)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:3067](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3067)

"none" | "active" | "canceling" | "past\_due" | "canceled"
