# GetOauthAuthorizeData

> **GetOauthAuthorizeData** = `object`

Defined in: [src/client/types.gen.ts:9971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9971)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9972](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9972)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9973)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9974](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9974)

**client\_id**

> **client\_id**: `string`

OAuth client ID

**code\_challenge**

> **code\_challenge**: `string`

PKCE code challenge

**code\_challenge\_method**

> **code\_challenge\_method**: `string`

PKCE method (must be 'S256')

**redirect\_uri**

> **redirect\_uri**: `string`

Callback URL (must be registered)

**response\_type**

> **response\_type**: `string`

Must be 'code'

**scope?**

> `optional` **scope**: `string`

Space-separated scopes

**state?**

> `optional` **state**: `string`

Opaque client state round-tripped to redirect\_uri

***

### url

> **url**: `"/oauth/authorize"`

Defined in: [src/client/types.gen.ts:10004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10004)
