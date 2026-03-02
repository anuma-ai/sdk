# HandlersWalletDetails

> **HandlersWalletDetails** = `object`

Defined in: [src/client/types.gen.ts:472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#472)

Wallet account details

## Properties

### account\_created\_at?

> `optional` **account\_created\_at**: `string`

Defined in: [src/client/types.gen.ts:476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#476)

When account was first created

***

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#477)

***

### balance\_updated\_at?

> `optional` **balance\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#481)

When balance was last synced from chain

***

### cached\_balance\_usd?

> `optional` **cached\_balance\_usd**: `number`

Defined in: [src/client/types.gen.ts:485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#485)

Balance in micro-dollars (USD \* 1,000,000)

***

### enrolled\_app\_id?

> `optional` **enrolled\_app\_id**: `number`

Defined in: [src/client/types.gen.ts:489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#489)

App ID for enrollment (0 if not enrolled)

***

### is\_enrolled?

> `optional` **is\_enrolled**: `boolean`

Defined in: [src/client/types.gen.ts:493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#493)

Whether enrolled in cost-limit model

***

### pending\_cost\_usd?

> `optional` **pending\_cost\_usd**: `number`

Defined in: [src/client/types.gen.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#497)

In-flight request holds in micro-dollars

***

### pro\_activated\_at?

> `optional` **pro\_activated\_at**: `string`

Defined in: [src/client/types.gen.ts:501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#501)

When user became Pro subscriber

***

### subscription\_tier?

> `optional` **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#505)

"basic" or "pro"
