# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#936)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#940)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#941)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#945)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#949)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#953)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#957)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#961)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#965)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#969)

"basic" or "pro"
