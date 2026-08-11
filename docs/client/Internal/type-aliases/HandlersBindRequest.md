# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1453)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1457)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1458)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1462](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1462)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1463](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1463)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1467)

"evm" | "cosmos"
