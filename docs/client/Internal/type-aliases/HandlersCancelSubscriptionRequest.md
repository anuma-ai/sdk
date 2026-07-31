# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1578)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1582)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1586](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1586)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1590](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1590)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1594](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1594)

competitor, when the user switched to another AI
