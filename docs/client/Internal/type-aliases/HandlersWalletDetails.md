# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:1625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1625)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:1629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1629)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1630)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1634](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1634)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:1638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1638)

Balance in micro-dollars (USD \* 1,000,000)

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:1642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1642)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:1646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1646)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:1650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1650)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1654)

"basic", "starter", or "pro"
