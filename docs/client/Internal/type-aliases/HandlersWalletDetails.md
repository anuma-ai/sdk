# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#672)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:676](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#676)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:677](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#677)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:681](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#681)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#685)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#689)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#693)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#697)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#701)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#705)

"basic" or "pro"
