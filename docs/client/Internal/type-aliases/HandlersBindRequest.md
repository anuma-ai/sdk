# HandlersBindRequest

> **HandlersBindRequest** = `object`

Defined in: [src/client/types.gen.ts:1440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1440)

## Properties

### address?

> `optional` **address**: `string`

Defined in: [src/client/types.gen.ts:1444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1444)

0x… (evm) or zeta1… (cosmos)

***

### nonce?

> `optional` **nonce**: `string`

Defined in: [src/client/types.gen.ts:1445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1445)

***

### pub\_key?

> `optional` **pub\_key**: `string`

Defined in: [src/client/types.gen.ts:1449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1449)

base64 secp256k1 pubkey; required for cosmos

***

### signature?

> `optional` **signature**: `string`

Defined in: [src/client/types.gen.ts:1450](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1450)

***

### wallet\_type?

> `optional` **wallet\_type**: `string`

Defined in: [src/client/types.gen.ts:1454](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1454)

"evm" | "cosmos"
