# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#701)

## Properties

### cancel\_at\_period\_end

> **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#705)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#709)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#713)

"month" | "year", only present if subscribed

***

### plan

> **plan**: `string`

Defined in: [src/client/types.gen.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#717)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#721)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#725)

tier user will switch to at period end

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#729)

"none" | "active" | "canceling" | "past\_due" | "canceled"
