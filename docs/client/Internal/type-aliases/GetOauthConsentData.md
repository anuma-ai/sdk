# GetOauthConsentData

> **GetOauthConsentData** = `object`

Defined in: [src/client/types.gen.ts:9706](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9706)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9707)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9708)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9709)

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

Defined in: [src/client/types.gen.ts:9739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9739)
