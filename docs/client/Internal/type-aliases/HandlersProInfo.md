# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2757](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2757)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2762)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant row (true while the grant is active, i.e. not revoked).

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2768](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2768)

Qualified is whether the account's current stake meets the threshold (a "do I clear the bar"
signal). Computed from the live per-wallet stake read at request time (cached value only as a
per-wallet fallback), so it reflects a fresh bind/stake immediately.

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2769](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2769)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2770)
