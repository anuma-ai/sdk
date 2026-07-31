# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1441)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1445)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1446](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1446)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1450](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1450)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1451](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1451)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1455](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1455)

"evm" | "cosmos"
