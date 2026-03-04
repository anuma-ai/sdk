# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = `object`

Defined in: [src/client/types.gen.ts:591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#591)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#595)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#599)

Unix timestamp, only present if subscribed

***

### interval?

> `optional` **interval**: `string`

Defined in: [src/client/types.gen.ts:603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#603)

"month" | "year", only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:607](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#607)

"free" | "starter" | "pro"

***

### scheduled\_interval?

> `optional` **scheduled\_interval**: `string`

Defined in: [src/client/types.gen.ts:611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#611)

billing interval of the scheduled plan

***

### scheduled\_plan?

> `optional` **scheduled\_plan**: `string`

Defined in: [src/client/types.gen.ts:615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#615)

tier user will switch to at period end

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#619)

"none" | "active" | "canceling" | "past\_due" | "canceled"
