# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2465](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2465)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2469](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2469)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2473)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2477)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2481)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2485)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2489)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2493)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2497)

"none" | "active" | "canceling" | "past\_due" | "canceled"
