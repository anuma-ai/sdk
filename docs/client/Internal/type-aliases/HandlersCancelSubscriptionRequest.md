# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1589)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1593](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1593)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1597](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1597)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1601](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1601)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1605](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1605)

competitor, when the user switched to another AI
