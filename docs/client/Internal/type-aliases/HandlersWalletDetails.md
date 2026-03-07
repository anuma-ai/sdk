# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#898)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:902](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#902)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#903)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:907](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#907)

When balance was last synced from chain

***

### cached\_balance\_usd

> **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:911](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#911)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:915](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#915)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled

> **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:919](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#919)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd

> **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#923)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#927)

When user became Pro subscriber

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:931](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#931)

"basic" or "pro"
