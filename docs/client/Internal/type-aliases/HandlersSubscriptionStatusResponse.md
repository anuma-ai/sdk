# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2674)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2678)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2682)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2686)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2690)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2694](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2694)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2698](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2698)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2702)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2706](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2706)

"none" | "active" | "canceling" | "past\_due" | "canceled"
