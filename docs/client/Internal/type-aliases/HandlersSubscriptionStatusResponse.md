# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2488)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2492)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2496)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2500)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2504](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2504)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2508](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2508)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2512](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2512)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2516](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2516)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2520](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2520)

"none" | "active" | "canceling" | "past\_due" | "canceled"
