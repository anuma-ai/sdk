# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#423)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#427)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#428)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#432)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#436)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#440)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#444)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#448)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#452)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#456)

"basic" or "pro"
