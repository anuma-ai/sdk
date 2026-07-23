# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2653](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2653)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2657](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2657)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2661](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2661)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2665](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2665)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2669](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2669)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2673)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2677](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2677)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2681](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2681)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2685)

"none" | "active" | "canceling" | "past\_due" | "canceled"
