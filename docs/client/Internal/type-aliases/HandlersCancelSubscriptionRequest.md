# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1730](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1730)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1734)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1738)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1742)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1746)

competitor, when the user switched to another AI
