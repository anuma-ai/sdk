# GetOauthConsentData

> **GetOauthConsentData** = `object`

Defined in: [src/client/types.gen.ts:10569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10569)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10570)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:10571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10571)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10572)

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

Defined in: [src/client/types.gen.ts:10602](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10602)
