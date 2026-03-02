# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#728)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#732)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#733)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#737)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#741)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#745)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:749](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#749)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#753)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:757](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#757)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:761](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#761)

"basic" or "pro"
