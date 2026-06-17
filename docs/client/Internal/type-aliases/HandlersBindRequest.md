# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1382)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1386)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1387)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1391)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1392)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1396)

"evm" | "cosmos"
