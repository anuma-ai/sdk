# HandlersBootstrapResponse

> **HandlersBootstrapResponse** = `object`

Defined in: [src/client/types.gen.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#387)

## Properties

### build?

> `optional` **build**: [`HandlersBootstrapBuild`](HandlersBootstrapBuild.md)

Defined in: [src/client/types.gen.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#388)

***

### flags?

> `optional` **flags**: `object`

Defined in: [src/client/types.gen.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#393)

Flags maps registered feature-flag keys to the variant assigned to this user.
Variant values are typed by PostHog: bool for boolean flags, string for multivariate.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### user?

> `optional` **user**: [`HandlersBootstrapUser`](HandlersBootstrapUser.md)

Defined in: [src/client/types.gen.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#396)
