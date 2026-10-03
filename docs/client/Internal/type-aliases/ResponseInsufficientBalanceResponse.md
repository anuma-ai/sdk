# ResponseInsufficientBalanceResponse

> **ResponseInsufficientBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1190](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1190)

## Properties

### available\_micro\_usd?

> `optional` **available\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1195](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1195)

AvailableMicroUSD is the user's spendable balance at the moment of the
failed reservation (cached\_balance\_usd; single-column model, epic #1092 PR4).

***

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:1196](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1196)

***

### error

> **error**: `string`

Defined in: [src/client/types.gen.ts:1197](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1197)

***

### gate?

> `optional` **gate**: `string`

Defined in: [src/client/types.gen.ts:1201](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1201)

Gate disambiguates the failure source — see BalanceGate\* constants.

***

### request\_id?

> `optional` **request\_id**: `string`

Defined in: [src/client/types.gen.ts:1202](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1202)

***

### required\_micro\_usd?

> `optional` **required\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1208)

RequiredMicroUSD is the hold the server attempted to reserve. For
Gate=BalanceGateMinimum this is the global per-request floor; for
Gate=BalanceGateModel this is the model-aware worst-case cost.

***

### trace\_id?

> `optional` **trace\_id**: `string`

Defined in: [src/client/types.gen.ts:1209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1209)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1210](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1210)
