# ResponseInsufficientBalanceResponse

> **ResponseInsufficientBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1058)

## Properties

### available\_micro\_usd?

> `optional` **available\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1063)

AvailableMicroUSD is the user's spendable balance at the moment of the
failed reservation (cached\_balance\_usd; single-column model, epic #1092 PR4).

***

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:1064](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1064)

***

### error

> **error**: `string`

Defined in: [src/client/types.gen.ts:1065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1065)

***

### gate?

> `optional` **gate**: `string`

Defined in: [src/client/types.gen.ts:1069](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1069)

Gate disambiguates the failure source — see BalanceGate\* constants.

***

### request\_id?

> `optional` **request\_id**: `string`

Defined in: [src/client/types.gen.ts:1070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1070)

***

### required\_micro\_usd?

> `optional` **required\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1076)

RequiredMicroUSD is the hold the server attempted to reserve. For
Gate=BalanceGateMinimum this is the global per-request floor; for
Gate=BalanceGateModel this is the model-aware worst-case cost.

***

### trace\_id?

> `optional` **trace\_id**: `string`

Defined in: [src/client/types.gen.ts:1077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1077)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1078)
