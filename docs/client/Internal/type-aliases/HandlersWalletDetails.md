# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:2716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2716)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:2720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2720)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2721)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2725)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:2729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2729)

Balance in micro-dollars (USD \* 1,000,000)

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:2733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2733)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2737)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2741)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:2745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2745)

"basic", "starter", or "pro"
