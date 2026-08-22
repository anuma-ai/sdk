# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11735)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11736)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11737)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11743)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11749](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11749)
