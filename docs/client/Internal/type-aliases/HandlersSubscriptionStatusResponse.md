# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2549)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2553)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2557](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2557)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2561)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2565](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2565)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2569)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2573](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2573)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2577)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2581)

"none" | "active" | "canceling" | "past\_due" | "canceled"
