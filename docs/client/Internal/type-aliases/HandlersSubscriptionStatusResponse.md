# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2335)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2339)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2343)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2347)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2351)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2355)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2359)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2363)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2367)

"none" | "active" | "canceling" | "past\_due" | "canceled"
