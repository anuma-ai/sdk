# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:931](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#931)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#935)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:939](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#939)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:943](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#943)

"month" | "year", only present if subscribed

***

### payment\_provider?

> `optional` **payment\_provider**: `string`

Defined in: [src/client/types.gen.ts:947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#947)

"stripe" | "revenuecat" — tells the client how to manage subscription

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:951](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#951)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:955](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#955)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#959)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#963)

"none" | "active" | "canceling" | "past\_due" | "canceled"
