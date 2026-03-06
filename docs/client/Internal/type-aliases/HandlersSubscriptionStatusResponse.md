# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:633](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#633)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#637)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:641](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#641)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:645](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#645)

"month" | "year", only present if subscribed

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:649](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#649)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:653](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#653)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:657](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#657)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:661](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#661)

"none" | "active" | "canceling" | "past\_due" | "canceled"
