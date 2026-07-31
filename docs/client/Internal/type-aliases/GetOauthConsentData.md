# GetOauthConsentData

> **GetOauthConsentData** = `object`

Defined in: [src/client/types.gen.ts:10923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10923)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10924)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:10925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10925)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10926)

**client\_id**

> **client\_id**: `string`

OAuth client ID

**code\_challenge**

> **code\_challenge**: `string`

PKCE code challenge

**code\_challenge\_method**

> **code\_challenge\_method**: `string`

PKCE method (S256)

**reason?**

> `optional` **reason**: `string`

Consent reason (first\_grant, revoked, scope\_expansion)

**redirect\_uri**

> **redirect\_uri**: `string`

Callback URL

**scope?**

> `optional` **scope**: `string`

Space-separated scopes

**state?**

> `optional` **state**: `string`

Opaque client state

***

### url

> **url**: `"/oauth/consent"`

Defined in: [src/client/types.gen.ts:10956](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10956)
