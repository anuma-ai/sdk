# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2298)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2303)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant row (true while the grant is active, i.e. not revoked).

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2308)

Qualified is whether last-polled stake currently meets the threshold (a "do I clear the bar"
signal that can lag a fresh bind until the first poll).

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2309)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2310)
