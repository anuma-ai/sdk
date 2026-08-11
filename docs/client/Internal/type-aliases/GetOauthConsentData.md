# GetOauthConsentData

> **GetOauthConsentData** = `object`

Defined in: [src/client/types.gen.ts:11790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11790)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11791)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:11792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11792)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11793)

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

Defined in: [src/client/types.gen.ts:11823](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11823)
