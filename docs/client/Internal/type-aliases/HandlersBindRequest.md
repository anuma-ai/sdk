# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1424)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1428)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1429](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1429)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1433](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1433)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1434)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1438](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1438)

"evm" | "cosmos"
