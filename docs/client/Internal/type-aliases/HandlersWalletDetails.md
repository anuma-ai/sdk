# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#784)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#788)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#789)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#793)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#797)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:801](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#801)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:805](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#805)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:809](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#809)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:813](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#813)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#817)

"basic" or "pro"
