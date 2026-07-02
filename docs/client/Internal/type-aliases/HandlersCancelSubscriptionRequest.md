# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1499)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1503](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1503)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1507](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1507)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1511](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1511)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1515](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1515)

competitor, when the user switched to another AI
