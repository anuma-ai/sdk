# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2861)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2865)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2869](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2869)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2873)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2877)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2881)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2885)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2889)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2893)

"none" | "active" | "canceling" | "past\_due" | "canceled"
