# ResponseInsufficientBalanceResponse

> **ResponseInsufficientBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1041](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1041)

## Properties

### available\_micro\_usd?

> `optional` **available\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1046)

AvailableMicroUSD is the user's spendable balance at the moment of the
failed reservation (cached\_balance\_usd - pending\_cost\_usd).

***

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:1047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1047)

***

### error

> **error**: `string`

Defined in: [src/client/types.gen.ts:1048](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1048)

***

### gate?

> `optional` **gate**: `string`

Defined in: [src/client/types.gen.ts:1052](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1052)

Gate disambiguates the failure source — see BalanceGate\* constants.

***

### request\_id?

> `optional` **request\_id**: `string`

Defined in: [src/client/types.gen.ts:1053](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1053)

***

### required\_micro\_usd?

> `optional` **required\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1059)

RequiredMicroUSD is the hold the server attempted to reserve. For
Gate=BalanceGateMinimum this is the global per-request floor; for
Gate=BalanceGateModel this is the model-aware worst-case cost.

***

### trace\_id?

> `optional` **trace\_id**: `string`

Defined in: [src/client/types.gen.ts:1060](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1060)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1061)
