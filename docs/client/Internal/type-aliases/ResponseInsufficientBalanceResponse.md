# ResponseInsufficientBalanceResponse

> **ResponseInsufficientBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1077)

## Properties

### available\_micro\_usd?

> `optional` **available\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1082)

AvailableMicroUSD is the user's spendable balance at the moment of the
failed reservation (cached\_balance\_usd; single-column model, epic #1092 PR4).

***

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:1083](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1083)

***

### error

> **error**: `string`

Defined in: [src/client/types.gen.ts:1084](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1084)

***

### gate?

> `optional` **gate**: `string`

Defined in: [src/client/types.gen.ts:1088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1088)

Gate disambiguates the failure source — see BalanceGate\* constants.

***

### request\_id?

> `optional` **request\_id**: `string`

Defined in: [src/client/types.gen.ts:1089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1089)

***

### required\_micro\_usd?

> `optional` **required\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1095)

RequiredMicroUSD is the hold the server attempted to reserve. For
Gate=BalanceGateMinimum this is the global per-request floor; for
Gate=BalanceGateModel this is the model-aware worst-case cost.

***

### trace\_id?

> `optional` **trace\_id**: `string`

Defined in: [src/client/types.gen.ts:1096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1096)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1097)
