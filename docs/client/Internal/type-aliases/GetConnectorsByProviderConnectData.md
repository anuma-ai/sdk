# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:12246](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12246)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:12247](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12247)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:12248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12248)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:12254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12254)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:12260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12260)
