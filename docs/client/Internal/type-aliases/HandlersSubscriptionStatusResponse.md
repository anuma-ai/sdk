# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:955](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#955)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#959)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#963)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:967](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#967)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#971)

"stripe" | "revenuecat" — tells the client how to manage subscription

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:975](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#975)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:979](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#979)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:983](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#983)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:987](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#987)

"none" | "active" | "canceling" | "past\_due" | "canceled"
