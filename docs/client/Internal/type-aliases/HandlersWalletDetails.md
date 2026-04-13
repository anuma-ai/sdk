# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1300)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:1304](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1304)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1305)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1309)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:1313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1313)

Balance in micro-dollars (USD \* 1,000,000)

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:1317](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1317)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:1321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1321)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1325)

"basic" or "pro"
