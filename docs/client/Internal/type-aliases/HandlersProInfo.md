# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2401](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2401)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2406)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant row (true while the grant is active, i.e. not revoked).

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2412](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2412)

Qualified is whether the account's current stake meets the threshold (a "do I clear the bar"
signal). Computed from the live per-wallet stake read at request time (cached value only as a
per-wallet fallback), so it reflects a fresh bind/stake immediately.

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2413)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2414)
