# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1851)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1855)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1859)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1863)

Total credits ever received (1 credit = $0.01)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1867)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1871)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1872)
