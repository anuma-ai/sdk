# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11021)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11025](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11025)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11026)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11032)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11033](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11033)
