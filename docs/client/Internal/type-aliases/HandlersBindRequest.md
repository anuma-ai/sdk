# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1483](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1483)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1487)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1488)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1492)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1493)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1497)

"evm" | "cosmos"
