# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1581)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1585](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1585)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1586](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1586)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1590](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1590)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1591)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1595)

"evm" | "cosmos"
