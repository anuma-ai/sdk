# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1512](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1512)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1516](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1516)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1520](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1520)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1524](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1524)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1528](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1528)

competitor, when the user switched to another AI
