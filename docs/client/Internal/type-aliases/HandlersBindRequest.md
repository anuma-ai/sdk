# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1416](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1416)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1420](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1420)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1421](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1421)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1425)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1426)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1430)

"evm" | "cosmos"
