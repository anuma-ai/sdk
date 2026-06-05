# GetOauthAuthorizeData

> **GetOauthAuthorizeData** = `object`

Defined in: [src/client/types.gen.ts:9289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9289)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9290)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:9291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9291)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9292)

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

Defined in: [src/client/types.gen.ts:9322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9322)
