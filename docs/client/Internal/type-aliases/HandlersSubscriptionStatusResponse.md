# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:2598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2598)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:2602](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2602)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:2606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2606)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:2610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2610)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:2614](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2614)

"stripe" | "revenuecat" | "staking" — tells the client how to manage subscription (no portal for "staking"; manage on-chain)

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:2618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2618)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:2622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2622)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:2626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2626)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:2630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2630)

"none" | "active" | "canceling" | "past\_due" | "canceled"
