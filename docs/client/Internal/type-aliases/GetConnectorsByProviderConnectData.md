# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9688](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9688)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9689)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9690)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9696](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9696)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9702)
