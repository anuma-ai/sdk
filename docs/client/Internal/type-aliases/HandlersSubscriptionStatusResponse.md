# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#374)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#378)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#382)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#386)

"month" | "year", only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#390)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#394)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#398)

tier user will switch to at period end

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#402)

"none" | "active" | "canceling" | "past\_due" | "canceled"
