# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1632](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1632)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1636](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1636)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1640](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1640)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1644)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1648)

competitor, when the user switched to another AI
