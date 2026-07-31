# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11010)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11014)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11015](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11015)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11021)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11022)
