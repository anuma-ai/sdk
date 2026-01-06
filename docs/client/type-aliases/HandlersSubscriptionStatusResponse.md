# HandlersSubscriptionStatusResponse

> **HandlersSubscriptionStatusResponse** = \{ `cancel_at_period_end?`: `boolean`; `current_period_end?`: `number`; `plan?`: `string`; `status?`: `string`; \}

Defined in: [src/client/types.gen.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L84)

## Properties

### cancel\_at\_period\_end?

> `optional` **cancel\_at\_period\_end**: `boolean`

Defined in: [src/client/types.gen.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L88)

true if scheduled to cancel

***

### current\_period\_end?

> `optional` **current\_period\_end**: `number`

Defined in: [src/client/types.gen.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L92)

Unix timestamp, only present if subscribed

***

### plan?

> `optional` **plan**: `string`

Defined in: [src/client/types.gen.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L96)

"free" | "pro"

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L100)

"none" | "active" | "canceling" | "past_due" | "canceled"
