# HandlersProInfo

> **HandlersProInfo** = `object`

Defined in: [src/client/types.gen.ts:2283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2283)

## Properties

### pro\_active?

> `optional` **pro\_active**: `boolean`

Defined in: [src/client/types.gen.ts:2288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2288)

ProActive is the authoritative state: whether the account is actually Pro via stake right now,
derived from the grant row (true while the grant is active, i.e. not revoked).

***

### qualified?

> `optional` **qualified**: `boolean`

Defined in: [src/client/types.gen.ts:2293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2293)

Qualified is whether last-polled stake currently meets the threshold (a "do I clear the bar"
signal that can lag a fresh bind until the first poll).

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2294)

***

### threshold\_zeta?

> `optional` **threshold\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2295)
