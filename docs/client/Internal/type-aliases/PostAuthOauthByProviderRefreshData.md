# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10559)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10563)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10564)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10570)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10571)
