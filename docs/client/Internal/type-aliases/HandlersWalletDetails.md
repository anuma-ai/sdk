# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:2910](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2910)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:2914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2914)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2915](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2915)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2919](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2919)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:2923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2923)

Available balance in micro-USD (single-column model, epic #1092 PR4)

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2927)

When user became Pro subscriber

***

### starter\_activated\_at?

> `optional` **starter\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2931](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2931)

When user first became Starter subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:2935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2935)

"basic", "starter", or "pro"
