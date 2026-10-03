# HandlersReferralGrantStatsResponse

> **HandlersReferralGrantStatsResponse** = `object`

Defined in: [src/client/types.gen.ts:3021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3021)

## Properties

### limitations?

> `optional` **limitations**: `string`\[]

Defined in: [src/client/types.gen.ts:3027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3027)

Limitations states what this report cannot establish. Served in the
response, not just documented, because the numbers above invite a
stronger reading than they support.

***

### owed\_azeta?

> `optional` **owed\_azeta**: `string`

Defined in: [src/client/types.gen.ts:3032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3032)

OwedAzeta is total outstanding liability across all grants, as a decimal
string.

***

### referrers?

> `optional` **referrers**: [`HandlersReferralGrantReferrerStatResponse`](HandlersReferralGrantReferrerStatResponse.md)\[]

Defined in: [src/client/types.gen.ts:3036](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3036)

Referrers is never null.

***

### ungranted\_activations?

> `optional` **ungranted\_activations**: `number`

Defined in: [src/client/types.gen.ts:3042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3042)

UngrantedActivations counts activations that produced no grant. Expected
to be non-zero for legitimate reasons (inactive area, no referrer); a
value tracking total activations means grants are not landing.
