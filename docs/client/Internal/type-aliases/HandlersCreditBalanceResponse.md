# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1795)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1799)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1803)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1807](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1807)

Total credits ever received (1 credit = $0.01)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1811)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1815)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1816](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1816)
