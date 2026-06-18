# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1405)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1409)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1410)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1414)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1415](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1415)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1419)

"evm" | "cosmos"
