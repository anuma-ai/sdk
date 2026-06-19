# HandlersBootstrapResponse

> **HandlersBootstrapResponse** = `object`

Defined in: [src/client/types.gen.ts:1437](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1437)

## Properties

### build?

> `optional` **build**: [`HandlersBootstrapBuild`](HandlersBootstrapBuild.md)

Defined in: [src/client/types.gen.ts:1438](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1438)

***

### connectors?

> `optional` **connectors**: [`HandlersConnectorSettingResponse`](HandlersConnectorSettingResponse.md)\[]

Defined in: [src/client/types.gen.ts:1444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1444)

Connectors lists every known connector with its effective enabled state for
this environment. The client uses it to decide which connectors to surface;
per-user connection state stays on GET /api/v1/connectors. Defaults to \[].

***

### flags?

> `optional` **flags**: `object`

Defined in: [src/client/types.gen.ts:1449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1449)

Flags maps registered feature-flag keys to the variant assigned to this user.
Variant values are typed by PostHog: bool for boolean flags, string for multivariate.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### user?

> `optional` **user**: [`HandlersBootstrapUser`](HandlersBootstrapUser.md)

Defined in: [src/client/types.gen.ts:1452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1452)
