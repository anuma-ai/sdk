# HandlersCancelSubscriptionRequest

> **HandlersCancelSubscriptionRequest** = `object`

Defined in: [src/client/types.gen.ts:1489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1489)

## Properties

### comment?

> `optional` **comment**: `string`

Defined in: [src/client/types.gen.ts:1493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1493)

free-text from the survey's "Other" option

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:1497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1497)

Stripe cancellation\_details.feedback enum value

***

### reason\_detail?

> `optional` **reason\_detail**: `string`

Defined in: [src/client/types.gen.ts:1501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1501)

granular survey taxonomy (no native Stripe field)

***

### switched\_to?

> `optional` **switched\_to**: `string`

Defined in: [src/client/types.gen.ts:1505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1505)

competitor, when the user switched to another AI
