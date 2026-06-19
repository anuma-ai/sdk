# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2246](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2246)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2251](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2251)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant — so it stays true through the grace window even if Qualified dips.

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2256)

Qualified is whether last-polled stake currently meets the threshold (a "do I clear the bar"
signal that can lag a fresh bind until the first poll).

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2257)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2258)
