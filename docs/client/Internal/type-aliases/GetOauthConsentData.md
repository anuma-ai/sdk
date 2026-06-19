# GetOauthConsentData

> **GetOauthConsentData** = `object`

Defined in: [src/client/types.gen.ts:9796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9796)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9797)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9798)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9799)

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

Defined in: [src/client/types.gen.ts:9829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9829)
