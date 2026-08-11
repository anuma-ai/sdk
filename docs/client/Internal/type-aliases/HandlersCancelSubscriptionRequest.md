# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1602](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1602)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1606)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1610)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1614](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1614)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1618)

competitor, when the user switched to another AI
