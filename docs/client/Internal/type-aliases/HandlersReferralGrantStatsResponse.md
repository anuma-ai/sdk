# HandlersReferralGrantStatsResponse

> **HandlersReferralGrantStatsResponse** = `object`

Defined in: [src/client/types.gen.ts:2843](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2843)

## Properties

### limitations?

> `optional` **limitations**: `string`\[]

Defined in: [src/client/types.gen.ts:2849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2849)

Limitations states what this report cannot establish. Served in the
response, not just documented, because the numbers above invite a
stronger reading than they support.

***

### owed\_azeta?

> `optional` **owed\_azeta**: `string`

Defined in: [src/client/types.gen.ts:2854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2854)

OwedAzeta is total outstanding liability across all grants, as a decimal
string.

***

### referrers?

> `optional` **referrers**: [`HandlersReferralGrantReferrerStatResponse`](HandlersReferralGrantReferrerStatResponse.md)\[]

Defined in: [src/client/types.gen.ts:2858](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2858)

Referrers is never null.

***

### ungranted\_activations?

> `optional` **ungranted\_activations**: `number`

Defined in: [src/client/types.gen.ts:2864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2864)

UngrantedActivations counts activations that produced no grant. Expected
to be non-zero for legitimate reasons (inactive area, no referrer); a
value tracking total activations means grants are not landing.
