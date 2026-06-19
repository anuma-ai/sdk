# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2269](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2269)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2274)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant — so it stays true through the grace window even if Qualified dips.

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2279)

Qualified is whether last-polled stake currently meets the threshold (a "do I clear the bar"
signal that can lag a fresh bind until the first poll).

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2280)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2281)
