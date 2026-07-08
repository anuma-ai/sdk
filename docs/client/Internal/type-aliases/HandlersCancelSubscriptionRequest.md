# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1507](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1507)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1511](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1511)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1515](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1515)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1519](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1519)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1523](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1523)

competitor, when the user switched to another AI
